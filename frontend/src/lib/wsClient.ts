// Simple WebSocket client with auto-reconnect and message routing
import { WS_URL } from './config';

type Handlers = {
  onState?:   (msg:any)=>void;
  onMetric?:  (msg:any)=>void;
  onLog?:     (msg:any)=>void;
  onError?:   (msg:any)=>void;
};

export class WsClient {
  private socket: WebSocket | null = null;
  constructor(private handlers: Handlers = {}) {}

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.socket = new WebSocket(WS_URL);
    this.socket.addEventListener('open', () => console.log('[WS] open'));
    this.socket.addEventListener('close', () => {
      console.log('[WS] closed, retry in 2s');
      setTimeout(()=>this.connect(), 2000);
    });
    this.socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        switch (msg.type) {
          case 'STATE':  this.handlers.onState?.(msg);  break;
          case 'METRIC': this.handlers.onMetric?.(msg); break;
          case 'LOG':    this.handlers.onLog?.(msg);    break;
          case 'ERROR':  this.handlers.onError?.(msg);  break;
          default: console.debug('[WS] unhandled', msg);
        }
      } catch (e) {
        console.error('[WS] parse error', e);
      }
    });
  }
}
