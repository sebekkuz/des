import { EventQueue } from './eventQueue.js';
import { v4 as uuidv4 } from 'uuid';

// Basic discrete-event simulation engine.  This implementation runs a
// single simulation loop on a Node.js interval.  It supports start,
// pause and reset operations.  Real logic should schedule events
// according to model definitions.  Here we simulate the passage of
// time by incrementing simTime.

export class Engine {
  constructor(model) {
    this.model = model;
    this.eq = new EventQueue();
    this.simTime = 0;
    this.running = false;
    this._timer = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._loop();
  }

  pause() {
    this.running = false;
  }

  reset() {
    this.simTime = 0;
    this.eq = new EventQueue();
    // TODO: reset components and entities
  }

  scheduleProcess(dt, fn) {
    this.eq.push(this.simTime + dt, fn);
  }

  getState() {
    return {
      simTime: this.simTime,
      running: this.running,
      // In the real engine we would include component states and metrics
    };
  }

  _loop() {
    if (!this.running) return;
    // Execute events up to a certain horizon per tick
    let processed = 0;
    const horizon = 100; // number of events per tick
    while (processed < horizon) {
      const next = this.eq.peekTime();
      if (next > this.simTime) {
        // advance time to next event or increment
        this.simTime = next;
      }
      const evt = this.eq.pop();
      if (!evt) break;
      evt.callback();
      processed++;
    }
    // schedule next tick
    setImmediate(() => this._loop());
  }
}