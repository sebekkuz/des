// backend/src/sim/engine.js
import { EventQueue } from './eventQueue.js';

// Proste PRNG na bazie seed (dla deterministyczności metryk, opcjonalnie)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

// Sampling rozkładów – MVP
function sampleDist(dist, rng) {
  if (!dist || !dist.type) return 0;
  const u = rng();
  switch (dist.type) {
    case 'Exponential': {
      const mean = Number(dist.mean ?? 1);
      // inverse CDF: -mean * ln(1-u)
      return -mean * Math.log(1 - u);
    }
    case 'Uniform': {
      const a = Number(dist.min ?? 0);
      const b = Number(dist.max ?? 1);
      return a + (b - a) * u;
    }
    case 'Triangular': {
      const a = Number(dist.min ?? 0);
      const b = Number(dist.max ?? 1);
      const c = Number(dist.mode ?? (a + b) / 2);
      const F = (c - a) / (b - a);
      if (u < F) return a + Math.sqrt(u * (b - a) * (c - a));
      return b - Math.sqrt((1 - u) * (b - a) * (b - c));
    }
    default:
      return 0;
  }
}

export class Engine {
  constructor(callbacks = {}) {
    this.onState  = callbacks.onState  || (() => {});
    this.onMetric = callbacks.onMetric || (() => {});
    this.onLog    = callbacks.onLog    || (() => {});
    this.onError  = callbacks.onError  || (() => {});

    this.eq = new EventQueue();
    this.simTime = 0;          // czas symulacji [s]
    this.running = false;
    this._tickHandle = null;

    // model / KPI
    this.model = null;
    this.stopAt = null;
    this.rng = Math.random;
    this.metrics = {
      throughput: 0,           // liczba sztuk wysłanych do SNK
    };

    // dla generatorów SRC w MVP
    this.generators = [];      // { id, interarrivalDist }
    this.links = [];           // [{from,to}]
    this.sinks = new Set();    // id komponentów typu EntitySink
  }

  // wczytanie modelu (MVP: obsługa ścieżki SRC->SNK)
  loadModel(model) {
    this.reset();

    this.model = model || {};
    const globals = this.model?.globals || {};
    const seed = Number(globals?.rng?.seed ?? 1);
    this.rng = mulberry32(seed);

    // stopCondition.time (sekundy)
    this.stopAt = Number(globals?.stopCondition?.time ?? NaN);
    if (!Number.isFinite(this.stopAt) || this.stopAt <= 0) {
      // domyślnie 1h
      this.stopAt = 3600;
    }

    // wczytaj definicje i linki
    const define = this.model?.define || {};
    const links  = Array.isArray(this.model?.links) ? this.model.links : [];
    this.links = links.map(l => ({ from: String(l.from), to: String(l.to) }));

    // zidentyfikuj sinki
    this.sinks.clear();
    for (const [id, def] of Object.entries(define)) {
      if (String(def.type) === 'EntitySink') this.sinks.add(id);
    }

    // zidentyfikuj generatory, ich rozkłady i czy istnieje droga do SNK
    this.generators = [];
    for (const [id, def] of Object.entries(define)) {
      if (String(def.type) !== 'EntityGenerator') continue;

      let inter = 1; // fallback
      const ii = def.inputs || {};
      const it = ii.InterarrivalTime;
      if (it && it.dist) inter = it.dist;

      // sprawdź, czy jest jakakolwiek ścieżka do SNK (MVP: ignorujemy gałęzie)
      const reachesSink = this._hasPathToSink(id);
      if (!reachesSink) {
        this.onLog({ level: 'warn', msg: `Generator ${id} nie ma ścieżki do SNK (pomijam w MVP)`, at: Date.now() });
        continue;
      }

      this.generators.push({ id, interarrivalDist: inter });
    }

    // zaplanuj pierwsze zdarzenia generatorów
    this.eq = new EventQueue();
    for (const g of this.generators) {
      const t = sampleDist(g.interarrivalDist, this.rng);
      this.eq.push(t, () => this._onArrival(g));
    }

    this.onLog({ level: 'info', msg: `Model loaded. Generators: ${this.generators.length}, stopAt=${this.stopAt}s`, at: Date.now() });
    this._emitState();
  }

  // Sprawdza, czy istnieje ścieżka od 'startId' do jakiegokolwiek SNK (prosty DFS)
  _hasPathToSink(startId) {
    const adj = new Map();
    for (const { from, to } of this.links) {
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from).push(to);
    }
    const stack = [startId];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      if (this.sinks.has(cur)) return true;
      const nxt = adj.get(cur) || [];
      for (const n of nxt) stack.push(n);
    }
    return false;
    }

  // Zdarzenie przybycia (MVP: zakładamy bez kolejek/serwerów – prosto do SNK)
  _onArrival(g) {
    // w MVP traktujemy, że każda przybyła sztuka „dociera” do SNK (SRC->SNK)
    this.metrics.throughput += 1;

    // zaplanuj następne przybycie
    const dt = sampleDist(g.interarrivalDist, this.rng);
    this.eq.push(this.simTime + dt, () => this._onArrival(g));
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Główna pętla: co 50 ms czasu RZECZYWISTEGO dodajemy 1 s czasu SYMULACJI
    const realTickMs = 50;
    const simStepSec = 1;

    this._tickHandle = setInterval(() => {
      if (!this.running) return;

      // zwiększ czas symulacji
      this.simTime += simStepSec;

      // wykonaj wszystkie zdarzenia, których czas <= simTime
      while (true) {
        const next = this.eq.peekTime();
        if (next == null || next > this.simTime) break;
        const ev = this.eq.pop();
        try { ev.callback(); } catch (e) {
          this.onError(e);
        }
      }

      // emituj metryki i stan raz na tick (można dodać throttling)
      this._emitState();
      this._emitMetrics();

      // warunek stop
      if (this.simTime >= this.stopAt) {
        this.pause();
        this.onLog({ level: 'info', msg: `Stop condition reached (t=${this.simTime}s)`, at: Date.now() });
      }
    }, realTickMs);

    this.onLog({ level: 'info', msg: 'Simulation started', at: Date.now() });
    this._emitState();
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
    this.onLog({ level: 'info', msg: 'Simulation paused', at: Date.now() });
    this._emitState();
  }

  reset() {
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
    this.eq = new EventQueue();
    this.simTime = 0;
    this.running = false;
    this.metrics = { throughput: 0 };
  }

  _emitState() {
    this.onState({ simTime: this.simTime, running: this.running });
  }

  _emitMetrics() {
    // Wysyłamy paczkę metryk (możesz rozbudować o WIP, CT itd.)
    const series = [
      { name: 'throughput_cum', t: this.simTime, v: this.metrics.throughput }
    ];
    this.onMetric(series);
  }
}
