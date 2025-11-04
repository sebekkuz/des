
import React from 'react';

export default function Palette() {
  return (
    <div style={{ width: 200, borderRight:'1px solid #eee', padding:8 }}>
      <b>Palette</b>
      <div style={{ marginTop:8, fontSize:13, color:'#475569' }}>Drag components into the canvas</div>
      <ul style={{ marginTop:8 }}>
        <li>EntityGenerator</li>
        <li>Buffer</li>
        <li>Workstation</li>
        <li>QualityCheck</li>
        <li>Rework</li>
        <li>EntitySink</li>
      </ul>
    </div>
  );
}
