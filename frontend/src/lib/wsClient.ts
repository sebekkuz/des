
import { WS_URL } from './config';

type Cbs = {
  onState?: (m:any)=>void;
  onMetric?: (m:any)=>void;
  onLog?: (m:any)=>void;
  onError?: (m:any)=>void;
};

export class WsClient {
  ws: WebSocket | null = null;
  cbs: Cbs;
  constructor(cbs: Cbs = {}) { this.cbs = cbs; }
  connect() {
    if (this.ws) { try { this.ws.close(); } catch {} }
    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    ws.onopen = () => { console.log('[WS] open'); };
    ws.onclose = () => { console.log('[WS] close'); };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'STATE')  this.cbs.onState?.(msg);
        else if (msg.type === 'METRIC') this.cbs.onMetric?.(msg);
        else if (msg.type === 'LOG')    this.cbs.onLog?.(msg);
        else if (msg.type === 'ERROR')  this.cbs.onError?.(msg);
      } catch {}
    };
  }
}
