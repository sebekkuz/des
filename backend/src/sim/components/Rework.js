
// backend/src/sim/components/Rework.js
export class Rework {
  constructor(cfg = {}) {
    this.maxLoops = Number(cfg.MaxLoops ?? 1);
    this.serviceDist = cfg.ServiceTime?.dist || cfg.ServiceTime || { type:'Uniform', min:10, max:20 };
    this.completed = 0;
  }
  snapshot() {
    return { type: 'Rework', completed: this.completed };
  }
}
