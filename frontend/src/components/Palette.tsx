import React from 'react';

const items = [
  'EntityGenerator','Buffer','Workstation','QualityCheck','Rework','EntitySink'
];

export default function Palette() {
  return (
    <div style={{ width: 200, borderRight:'1px solid #ddd', padding:8 }}>
      <b>Palette</b>
      <div style={{ fontSize:12, color:'#444', marginTop:6 }}>Drag components into the canvas</div>
      <ul style={{ marginTop:10 }}>
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
