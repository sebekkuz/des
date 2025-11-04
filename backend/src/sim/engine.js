
// backend/src/sim/engine.js (ETAP 2)
import { EventQueue } from './eventQueue.js';
import { QualityCheck } from './components/QualityCheck.js';
import { Rework } from './components/Rework.js';
import { Conveyor } from './components/Conveyor.js';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

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
    this.simTime = 0;
    this.running = false;
    this._tickHandle = null;

    this.model = null;
    this.stopAt = 3600;
    this.rng = Math.random;
    this.metrics = { throughput: 0 };

    this.defs = new Map();
    this.links = [];          // {from,to,condition?,via?}
    this.adj = new Map();
    this.rev = new Map();
    this.sinks = new Set();
    this.generators = [];

    this.buffers = new Map();
    this.workstations = new Map();
    this.quality = new Map();
    this.reworks = new Map();
    this.conveyors = new Map();
  }

  loadModel(model) {
    this.reset();

    this.model = model || {};
    const globals = this.model?.globals || {};
    const seed = Number(globals?.rng?.seed ?? 1);
    this.rng = mulberry32(seed);
    const stopT = Number(globals?.stopCondition?.time ?? 3600);
    this.stopAt = Number.isFinite(stopT) && stopT > 0 ? stopT : 3600;

    const define = this.model?.define || {};
    const rawLinks = Array.isArray(this.model?.links) ? this.model.links : [];
    this.links = rawLinks.map(l => ({
      from: String(l.from),
      to: String(l.to),
      via: l.via ? String(l.via) : null,
      condition: l.condition && typeof l.condition === 'object' ? l.condition : null
    }));

    this.adj.clear(); this.rev.clear(); this.defs.clear();
    for (const [id, def] of Object.entries(define)) this.defs.set(id, def);
    for (const {from,to} of this.links) {
      if (!this.adj.has(from)) this.adj.set(from, []);
      this.adj.get(from).push(to);
      if (!this.rev.has(to)) this.rev.set(to, []);
      this.rev.get(to).push(from);
    }

    this.sinks.clear();
    this.buffers.clear();
    this.workstations.clear();
    this.quality.clear();
    this.reworks.clear();
    this.conveyors.clear();
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
      if (type === 'QualityCheck') this.quality.set(id, new QualityCheck(inputs));
      if (type === 'Rework') this.reworks.set(id, new Rework(inputs));
      if (type === 'Conveyor') this.conveyors.set(id, new Conveyor(inputs));
    }

    this.generators = [];
    for (const [id, def] of Object.entries(define)) {
      if (String(def.type) !== 'EntityGenerator') continue;
      const inputs = def.inputs || {};
      const it = inputs.InterarrivalTime;
      const inter = it && it.dist ? it.dist : { type:'Exponential', mean: 1 };
      if (!this._hasPathToSink(id)) {
        this.onLog({ level:'warn', msg:`Generator ${id} nie ma ścieżki do SNK`, at:Date.now() });
        continue;
      }
      self = this;
      this.generators.push({ id, interarrivalDist: inter });
    }

    this.eq = new EventQueue();
    for (const g of this.generators) {
      const t = sampleDist(g.interarrivalDist, this.rng);
      this.eq.push(t, () => this._onArrival(g));
    }

    this.onLog({ level:'info', msg:`Model loaded. Generators: ${this.generators.length}, stopAt=${this.stopAt}s`, at:Date.now() });
    this._emitState();
  }

  _hasPathToSink(startId) {
    const stack = [startId], seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      if (this.sinks.has(cur)) return true;
      for (const n of (this.adj.get(cur) || [])) stack.push(n);
    }
    return false;
  }

  _firstNext(id) {
    const arr = this.adj.get(id) || [];
    return arr.length ? arr[0] : null;
  }

  _nextByCondition(fromId, outcome) {
    for (const l of this.links) {
      if (l.from === fromId && l.condition && String(l.condition.expr) === String(outcome)) {
        return l;
      }
    }
    return null;
  }

  _findFirstLink(fromId) {
    for (const l of this.links) if (l.from === fromId) return l;
    return null;
  }

  _pushThroughLink(link) {
    const { to, via } = link;
    if (via && this.conveyors.has(via)) {
      const conv = this.conveyors.get(via);
      const dt = conv.transitTime();
      this.eq.push(this.simTime + dt, () => this._pushTo(to));
    } else {
      this._pushTo(to);
    }
  }

  // ---- FLOW ----
  _onArrival(g) {
    const next = this._firstNext(g.id);
    if (next) this._pushTo(next);
    const dt = sampleDist(g.interarrivalDist, this.rng);
    this.eq.push(this.simTime + dt, () => this._onArrival(g));
  }

  _pushTo(id) {
    const def = this.defs.get(id); if (!def) return;
    const type = String(def.type);

    if (type === 'EntitySink') {
      this.metrics.throughput += 1;
      return;
    }

    if (type === 'Buffer') {
      const b = this.buffers.get(id);
      const cap = b?.cap ?? Infinity;
      if (b) {
        if (b.q < cap) { b.q++; this._tryPushingFromBuffer(id); }
        else this.onLog({ level:'warn', msg:`Buffer ${id} full (q=${b.q}/${cap})`, at:Date.now() });
      } else {
        const link = this._findFirstLink(id); if (link) this._pushThroughLink(link);
      }
      return;
    }

    if (type === 'Workstation') {
      const ws = this.workstations.get(id); if (!ws) return;
      ws.inQ++; this._tryStartService(id); return;
    }

    if (type === 'QualityCheck') {
      const qc = this.quality.get(id);
      const outcome = qc ? (qc.decide(this.rng)) : 'ok';
      const condLink = this._nextByCondition(id, outcome);
      const fallback = this._findFirstLink(id);
      const link = condLink || fallback;
      if (link) this._pushThroughLink(link);
      return;
    }

    if (type === 'Rework') {
      const rw = this.reworks.get(id);
      const dt = sampleDist(rw?.serviceDist, this.rng) || 0;
      this.eq.push(this.simTime + dt, () => {
        if (rw) rw.completed++;
        const link = this._findFirstLink(id);
        if (link) this._pushThroughLink(link);
      });
      return;
    }

    const link = this._findFirstLink(id);
    if (link) this._pushThroughLink(link);
  }

  _tryPushingFromBuffer(bufId) {
    const b = this.buffers.get(bufId); if (!b || b.q <= 0) return;
    const link = this._findFirstLink(bufId); if (!link) return;
    const defNext = this.defs.get(link.to); if (!defNext) return;
    const tNext = String(defNext.type);

    if (tNext === 'Workstation') {
      const ws = this.workstations.get(link.to); if (!ws) return;
      const slotsFree = Math.max(ws.m - ws.busy, 0);
      if (slotsFree > 0 && b.q > 0) {
        b.q--; ws.inQ++; this._tryStartService(link.to);
      }
      return;
    }

    if (b.q > 0) { b.q--; this._pushThroughLink(link); }
  }

  _tryStartService(wsId) {
    const ws = this.workstations.get(wsId); if (!ws) return;
    while (ws.inQ > 0 && ws.busy < ws.m) {
      ws.inQ--; ws.busy++;
      const dt = sampleDist(ws.svcDist, this.rng) || 0;
      this.eq.push(this.simTime + dt, () => this._onServiceDone(wsId));
    }
  }

  _onServiceDone(wsId) {
    const ws = this.workstations.get(wsId); if (ws && ws.busy > 0) ws.busy--;
    this._tryStartService(wsId);
    const link = this._findFirstLink(wsId); if (link) this._pushThroughLink(link);
    for (const from of (this.rev.get(wsId) || [])) {
      if (this.buffers.has(from)) this._tryPushingFromBuffer(from);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const realTickMs = 50, simStepSec = 1;
    this._tickHandle = setInterval(() => {
      if (!this.running) return;
      this.simTime += simStepSec;

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
        this.onLog({ level:'info', msg:`Stop condition reached (t=${this.simTime}s)`, at:Date.now() });
      }
    }, realTickMs);

    this.onLog({ level:'info', msg:'Simulation started', at:Date.now() });
    this._emitState();
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
    this.onLog({ level:'info', msg:'Simulation paused', at:Date.now() });
    this._emitState();
  }

  reset() {
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
    this.eq = new EventQueue();
    this.simTime = 0;
    this.running = false;
    this.metrics = { throughput: 0 };
    for (const qc of this.quality.values()) qc.reset?.();
  }

  applyParam(id, key, value) {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Unknown component: ${id}`);
    def.inputs = def.inputs || {};
    def.inputs[key] = value;

    if (def.type === 'Buffer' && key === 'Capacity') {
      const b = this.buffers.get(id);
      if (b) b.cap = Number(value);
    }
    if (def.type === 'Workstation' && key === 'ServiceTime') {
      const ws = this.workstations.get(id);
      if (ws) ws.svcDist = value?.dist || value || ws.svcDist;
    }
    if (def.type === 'QualityCheck' && key === 'RejectProb') {
      const qc = this.quality.get(id);
      if (qc) qc.rejectProb = Number(value);
    }
    if (def.type === 'Conveyor') {
      const c = this.conveyors.get(id);
      if (c && (key === 'length' || key === 'Length')) c.length = Number(value);
      if (c && (key === 'speed'  || key === 'Speed'))  c.speed  = Number(value);
    }
  }

  _emitState() {
    const components = {};
    for (const [id, b] of this.buffers.entries()) components[id] = { type:'Buffer', q:b.q, cap:b.cap };
    for (const [id, w] of this.workstations.entries()) components[id] = { type:'Workstation', busy:w.busy, m:w.m, inQ:w.inQ };
    for (const [id, q] of this.quality.entries()) components[id] = { ...(components[id]||{}), type:'QualityCheck', ok:q.stats.ok, nok:q.stats.nok };
    for (const [id, r] of this.reworks.entries()) components[id] = { ...(components[id]||{}), type:'Rework', completed:r.completed };
    for (const [id, c] of this.conveyors.entries()) components[id] = { ...(components[id]||{}), type:'Conveyor', length:c.length, speed:c.speed };
    this.onState({ simTime: this.simTime, running: this.running, components });
  }

  _emitMetrics() {
    this.onMetric([{ name:'throughput_cum', t:this.simTime, v:this.metrics.throughput }]);
  }
}
