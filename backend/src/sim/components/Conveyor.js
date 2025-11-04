
// backend/src/sim/components/Conveyor.js
export class Conveyor {
  constructor(cfg = {}) {
    this.length = Number(cfg.length ?? cfg.Length ?? 1);
    this.speed  = Number(cfg.speed  ?? cfg.Speed  ?? 1);
  }
  transitTime() {
    if (!isFinite(this.length) || !isFinite(this.speed) || this.speed <= 0) return 0;
    return this.length / this.speed;
  }
  snapshot() {
    return { type: 'Conveyor', length: this.length, speed: this.speed };
  }
}
