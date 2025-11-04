
import React, { useMemo, useState } from 'react';
import { useModelStore } from '../store/useModelStore';
import { apiSetParam } from '../lib/modelIO';

export default function Inspector() {
  const selectedId = useModelStore(s => s.selectedId);
  const nodes = useModelStore(s => s.nodes);
  const node = useMemo(()=> nodes.find(n => n.id === selectedId) || null, [nodes, selectedId]);

  const [key, setKey] = useState('ServiceTime'); // common key for examples
  const [value, setValue] = useState('{"dist":{"type":"Triangular","min":8,"mode":10,"max":15}}');

  if (!node) return <div style={{ width: 280, borderLeft:'1px solid #e5e7eb', padding:8 }}>
    <b>Inspector</b>
    <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>Kliknij węzeł aby edytować.</div>
  </div>;

  const apply = async () => {
    try {
      const parsed = JSON.parse(value);
      await apiSetParam(node.id, key, parsed);
      alert('Param updated');
    } catch (e:any) {
      alert('Invalid JSON or update error: ' + e.message);
    }
  };

  return (
    <div style={{ width: 280, borderLeft:'1px solid #e5e7eb', padding:8 }}>
      <b>Inspector</b>
      <div style={{ fontSize:12, color:'#334155', marginTop:8 }}>Node: <b>{node.id}</b> <span style={{ color:'#64748b' }}>({node.type})</span></div>

      <div style={{ marginTop:12, fontSize:12 }}>
        <div>Input key (np. <code>Capacity</code> lub <code>ServiceTime</code>)</div>
        <input value={key} onChange={e=>setKey(e.target.value)} style={{ width:'100%', marginTop:4 }} />

        <div style={{ marginTop:8 }}>Value (JSON)</div>
        <textarea rows={6} value={value} onChange={e=>setValue(e.target.value)} style={{ width:'100%', fontFamily:'monospace', marginTop:4 }} />
        <button onClick={apply} style={{ marginTop:8 }}>Apply</button>

        <div style={{ marginTop:10, fontSize:11, color:'#64748b' }}>
          Przykłady wartości:
          <pre>{`{"dist":{"type":"Triangular","min":8,"mode":10,"max":15}}`}</pre>
          <pre>{`{"dist":{"type":"Exponential","mean":12}}`}</pre>
          <pre>{`100  // Capacity`}</pre>
        </div>
      </div>
    </div>
  );
}
