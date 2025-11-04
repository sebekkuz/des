// Placeholder WebSocket client for connecting to the backend.  Real
// implementation should handle reconnects, message parsing and state
// updates.

export class WsClient {
  private socket: WebSocket | null = null;

  constructor(private url: string) {}

  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => {
      console.log('WebSocket connected');
    });
    this.socket.addEventListener('message', (event) => {
      console.log('WS message', event.data);
    });
    this.socket.addEventListener('close', () => {
      console.log('WebSocket closed');
      this.socket = null;
    });
  }

  send(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }
}