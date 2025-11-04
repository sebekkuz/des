import React from 'react';
import { apiStart, apiPause, apiReset } from '../lib/modelIO';

export default function Toolbar() {
  return (
    <div style={{ padding: 6, borderBottom:'1px solid #ddd', display:'flex', gap:8 }}>
      <button onClick={()=>apiStart()}>Start</button>
      <button onClick={()=>apiPause()}>Pause</button>
      <button onClick={()=>apiReset()}>Reset</button>
    </div>
  );
}
