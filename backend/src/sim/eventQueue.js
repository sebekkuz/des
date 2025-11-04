// A simple min-heap based event queue.  Each event has a time and a
// callback.  This implementation is not optimised for extremely large
// models but demonstrates the idea of a discrete-event scheduler.

export class EventQueue {
  constructor() {
    this.heap = [];
  }

  push(time, callback) {
    const node = { time, callback };
    this.heap.push(node);
    this._heapifyUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._heapifyDown(0);
    }
    return top;
  }

  peekTime() {
    return this.heap.length > 0 ? this.heap[0].time : Infinity;
  }

  _heapifyUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].time >= this.heap[parent].time) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  _heapifyDown(idx) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * idx + 1;
      let right = 2 * idx + 2;
      let smallest = idx;
      if (left < length && this.heap[left].time < this.heap[smallest].time) {
        smallest = left;
      }
      if (right < length && this.heap[right].time < this.heap[smallest].time) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}