
import { WS_URL } from './config';

type Cbs = {
  onState?: (m:any)=>void;
  onMetric?: (m:any)=>void;
  onLog?: (m:any)=>void;
  onError?: (m:any)=>void;
  onOpenChange?: (online:boolean)=>void;
};

export class WsClient {
  ws: WebSocket | null = null;
  cbs: Cbs;
  backoff = 500;
  timer: any = null;
  constructor(cbs: Cbs = {}) { this.cbs = cbs; }
  connect() {
    if (this.ws) try { this.ws.close(); } catch {}
    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    ws.onopen = () => { this.backoff = 500; this.cbs.onOpenChange?.(true); console.log('[WS] open'); };
    ws.onclose = () => {
      this.cbs.onOpenChange?.(false);
      console.log('[WS] close');
      if (!document.hidden) {
        this.timer = setTimeout(()=> this.connect(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, 5000);
      }
    };
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
  reconnect() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.connect();
  }
}
