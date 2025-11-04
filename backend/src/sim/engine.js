// backend/src/sim/engine.js
import { EventQueue } from './eventQueue.js';

// Proste PRNG na bazie seed (dla deterministyczności metryk)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Sampling rozkładów
function sampleDist(dist, rng) {
  if (!dist || !dist.type) return 0;
  const u = rng();
  switch (dist.type) {
    case 'Exponential': {
      const mean = Number(dist.mean ?? 1);
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
    this.onState = callbacks.onState || (() => {});
    this.onMetric = callbacks.onMetric || (() => {});
    this.onLog = callbacks.onLog || (() => {});
    this.onError = callbacks.onError || (() => {});

    this.eq = new EventQueue();
    this.simTime = 0; // s
    this.running = false;
    this._tickHandle = null;

    // model / KPI
    this.model = null;
    this.stopAt = null;
    this.rng = Math.random;
    this.metrics = {
      throughput: 0, // ile dotarło do SNK
    };

    // Struktury modelu
    this.defs = new Map(); // id -> definicja
    this.links = []; // {from,to}
    this.adj = new Map(); // from -> [to]
    this.rev = new Map(); // to   -> [from]
    this.sinks = new Set();
    this.generators = []; // {id, interarrivalDist}

    // Stan komponentów
    this.buffers = new Map(); // id -> {cap,q}
    this.workstations = new Map(); // id -> {busy,m,svcDist,inQ}
  }

  loadModel(model) {
    this.reset();

    this.model = model || {};
    const globals = this.model?.globals || {};
    const seed = Number(globals?.rng?.seed ?? 1);
    this.rng = mulberry32(seed);

    this.stopAt = Number(globals?.stopCondition?.time ?? NaN);
    if (!Number.isFinite(this.stopAt) || this.stopAt <= 0) this.stopAt = 3600;

    const define = this.model?.define || {};
    const links = Array.isArray(this.model?.links) ? this.model.links : [];
    this.links = links.map((l) => ({ from: String(l.from), to: String(l.to) }));

    // indeksy grafu
    this.adj.clear();
    this.rev.clear();
    this.defs.clear();
    for (const [id, def] of Object.entries(define)) {
      this.defs.set(id, def);
    }
    for (const { from, to } of this.links) {
      if (!this.adj.has(from)) this.adj.set(from, []);
      this.adj.get(from).push(to);
      if (!this.rev.has(to)) this.rev.set(to, []);
      this.rev.get(to).push(from);
    }

    // komponenty
    this.sinks.clear();
    this.buffers.clear();
    this.workstations.clear();
    for (const [id, def] of Object.entries(define)) {
      const type = String(def.type);
      const inputs = def.inputs || {};
      if (type === 'EntitySink') this.sinks.add(id);
      if (type === 'Buffer') {
        const cap = Number(inputs.Capacity ?? Infinity);
        this.buffers.set(id, { cap, q: 0 });
      }
      if (type === 'Workstation') {
        const svcDist = inputs.ServiceTime?.dist || inputs.ServiceTime || null;
        const m = Number(inputs.m ?? 1);
        this.workstations.set(id, { busy: 0, m, svcDist, inQ: 0 });
      }
    }

    // generatory
    this.generators = [];
    for (const [id, def] of Object.entries(define)) {
      if (String(def.type) !== 'EntityGenerator') continue;
      const inputs = def.inputs || {};
      const it = inputs.InterarrivalTime;
      const inter = it && it.dist ? it.dist : 1;

      if (!this._hasPathToSink(id)) {
        this.onLog({
          level: 'warn',
          msg: `Generator ${id} nie ma ścieżki do SNK (pomijam w MVP)`,
          at: Date.now(),
        });
        continue;
      }
      this.generators.push({ id, interarrivalDist: inter });
    }

    // startowe zdarzenia
    this.eq = new EventQueue();
    for (const g of this.generators) {
      const t = sampleDist(g.interarrivalDist, this.rng);
      this.eq.push(t, () => this._onArrival(g));
    }

    this.onLog({
      level: 'info',
      msg: `Model loaded. Generators: ${this.generators.length}, stopAt=${this.stopAt}s`,
      at: Date.now(),
    });
    this._emitState();
  }

  _hasPathToSink(startId) {
    const stack = [startId];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      if (this.sinks.has(cur)) return true;
      const nxt = this.adj.get(cur) || [];
      for (const n of nxt) stack.push(n);
    }
    return false;
  }

  // --- RUCH JEDNOSTEK ---

  // przybycie z generatora
  _onArrival(g) {
    const next = this._firstNext(g.id);
    if (next) this._pushTo(next);

    const dt = sampleDist(g.interarrivalDist, this.rng);
    this.eq.push(this.simTime + dt, () => this._onArrival(g));
  }

  // wstaw do komponentu id
  _pushTo(id) {
    const def = this.defs.get(id);
    if (!def) return;
    const type = String(def.type);

    if (type === 'EntitySink') {
      this.metrics.throughput += 1;
      return;
    }

    if (type === 'Buffer') {
      const b = this.buffers.get(id);
      const cap = b?.cap ?? Infinity;
      if (b) {
        if (b.q < cap) {
          b.q++;
          this._tryPushingFromBuffer(id);
        } else {
          this.onLog({
            level: 'warn',
            msg: `Buffer ${id} full (q=${b.q}/${cap})`,
            at: Date.now(),
          });
        }
      } else {
        // brak stanu bufora -> przelotowo
        const next = this._firstNext(id);
        if (next) this._pushTo(next);
      }
      return;
    }

    if (type === 'Workstation') {
      const ws = this.workstations.get(id);
      if (!ws) return;
      ws.inQ++;
      this._tryStartService(id);
      return;
    }

    // inne typy (na razie przelotowo)
    const next = this._firstNext(id);
    if (next) this._pushTo(next);
  }

  // wypychaj z bufora do następnego
  _tryPushingFromBuffer(bufId) {
    const b = this.buffers.get(bufId);
    if (!b || b.q <= 0) return;
    const next = this._firstNext(bufId);
    if (!next) return;

    const defNext = this.defs.get(next);
    if (!defNext) return;
    const tNext = String(defNext.type);

    if (tNext === 'Workstation') {
      const ws = this.workstations.get(next);
      if (!ws) return;
      const slotsFree = Math.max(ws.m - ws.busy, 0);
      if (slotsFree > 0 && b.q > 0) {
        b.q--;
        ws.inQ++;
        this._tryStartService(next);
      }
      return;
    }

    // przelotowo
    if (b.q > 0) {
      b.q--;
      this._pushTo(next);
    }
  }

  // start obsługi w WS
  _tryStartService(wsId) {
    const ws = this.workstations.get(wsId);
    if (!ws) return;
    while (ws.inQ > 0 && ws.busy < ws.m) {
      ws.inQ--;
      ws.busy++;
      const dt = sampleDist(ws.svcDist, this.rng) || 0;
      this.eq.push(this.simTime + dt, () => this._onServiceDone(wsId));
    }
  }

  // koniec obsługi w WS
  _onServiceDone(wsId) {
    const ws = this.workstations.get(wsId);
    if (ws && ws.busy > 0) ws.busy--;
    // uruchom kolejne w WS
    this._tryStartService(wsId);
    // wyślij dalej
    const next = this._firstNext(wsId);
    if (next) this._pushTo(next);
    // jeśli poprzedzał bufor – spróbuj też wypchnąć z bufora (zwolniło się miejsce)
    for (const from of this.rev.get(wsId) || []) {
      if (this.buffers.has(from)) this._tryPushingFromBuffer(from);
    }
  }

  _firstNext(id) {
    const arr = this.adj.get(id) || [];
    return arr.length ? arr[0] : null;
  }

  // --- sterowanie pętlą DES ---

  start() {
    if (this.running) return;
    this.running = true;

    const realTickMs = 50; // zegar rzeczywisty
    const simStepSec = 1;  // krok czasu symulacji

    this._tickHandle = setInterval(() => {
      if (!this.running) return;

      this.simTime += simStepSec;

      // wykonaj wszystkie zdarzenia o czasie <= simTime
      while (true) {
        const next = this.eq.peekTime();
        if (next == null || next > this.simTime) break;
        const ev = this.eq.pop();
        try { ev.callback(); } catch (e) { this.onError(e); }
      }

      this._emitState();
      this._emitMetrics();

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
    const series = [
      { name: 'throughput_cum', t: this.simTime, v: this.metrics.throughput },
    ];
    this.onMetric(series);
  }
}
