
// backend/src/sim/Statistics.js
// Lightweight time-weighted statistics for WIP and Utilization
export class Statistics {
  constructor() {
    this.lastT = 0;
    this.wipIntegral = 0;     // sum(WIP) * dt
    this.utilIntegral = 0;    // sum(util per WS) * dt (avg across WS)
    this.samples = 0;
    this.scrapOk = 0;
    this.scrapNok = 0;
  }
  step(t, snapshot) {
    const dt = Math.max(0, t - this.lastT);
    this.lastT = t;
    // WIP: buffers.q + in service (sum busy)
    let wip = 0, utilSum = 0, wsCount = 0;
    for (const id in snapshot) {
      const s = snapshot[id];
      if (!s || !s.type) continue;
      if (s.type === 'Buffer') wip += Number(s.q || 0);
      if (s.type === 'Workstation') {
        wip += Number(s.busy || 0) + Number(s.inQ || 0);
        const m = Math.max(1, Number(s.m || 1));
        utilSum += Math.min(1, Number(s.busy || 0) / m);
        wsCount += 1;
      }
      if (s.type === 'QualityCheck') {
        this.scrapOk = Number(s.ok || this.scrapOk);
        this.scrapNok = Number(s.nok || this.scrapNok);
      }
    }
    const utilAvg = wsCount ? utilSum / wsCount : 0;
    this.wipIntegral  += wip * dt;
    this.utilIntegral += utilAvg * dt;
    this.samples += 1;
  }
  snapshotAverages(simTime) {
    const T = Math.max(simTime, 1e-9);
    return {
      WIP_avg: this.wipIntegral / T,
      Util_avg: this.utilIntegral / T,
      Scrap_rate: (this.scrapOk + this.scrapNok) > 0 ? (this.scrapNok / (this.scrapOk + this.scrapNok)) : 0
    };
  }
}
