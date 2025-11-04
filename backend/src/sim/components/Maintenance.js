
export class Maintenance {
  constructor(cfg = {}) {
    this.target = String(cfg.Target || cfg.target || '');
    this.MTBF = Number(cfg.MTBF ?? 3600);
    this.MTTR = Number(cfg.MTTR ?? 600);
    this.down = false;
    this.downtime = 0;
    this._downStart = null;
  }
  scheduleNextFailure(now, rng, scheduleCb) {
    const u = rng();
    const ttf = -this.MTBF * Math.log(1 - u);
    scheduleCb(now + ttf, 'fail');
  }
  handle(now, kind, rng, scheduleCb) {
    if (kind === 'fail' && !this.down) {
      this.down = true;
      this._downStart = now;
      const u = rng();
      const ttr = -this.MTTR * Math.log(1 - u);
      scheduleCb(now + ttr, 'repair');
      return;
    }
    if (kind === 'repair' && this.down) {
      this.down = false;
      if (this._downStart != null) this.downtime += Math.max(0, now - this._downStart);
      this._downStart = null;
      this.scheduleNextFailure(now, rng, scheduleCb);
    }
  }
  end(now) {
    if (this.down && this._downStart != null) {
      this.downtime += Math.max(0, now - this._downStart);
      this._downStart = null;
      this.down = false;
    }
  }
  snapshot() { return { type:'Maintenance', target:this.target, down:this.down, downtime:this.downtime, MTBF:this.MTBF, MTTR:this.MTTR }; }
}
