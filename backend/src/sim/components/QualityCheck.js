
// backend/src/sim/components/QualityCheck.js
export class QualityCheck {
  constructor(cfg = {}) {
    this.rejectProb = Number(cfg.RejectProb ?? 0.05);
    this.stats = { ok: 0, nok: 0 };
  }
  decide(rng) {
    const u = rng();
    const reject = u < this.rejectProb;
    if (reject) this.stats.nok++; else this.stats.ok++;
    return reject ? 'reject' : 'ok';
  }
  snapshot() {
    const total = this.stats.ok + this.stats.nok;
    return {
      type: 'QualityCheck',
      ok: this.stats.ok,
      nok: this.stats.nok,
      yield: total > 0 ? this.stats.ok / total : 1
    };
  }
  reset() { this.stats = { ok: 0, nok: 0 }; }
}
