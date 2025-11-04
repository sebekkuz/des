
import React, { useState } from 'react';
import { apiLoadModelFromText, parseModel } from '../lib/modelIO';
import { toGraph } from '../lib/graph';
import { useModelStore } from '../store/useModelStore';

const EXAMPLE = `define:
  SRC:
    type: EntityGenerator
    inputs:
      InterarrivalTime:
        dist: { type: Exponential, mean: 8 }
      EntityType: Part
  BUF: { type: Buffer, inputs: { Capacity: 100 } }
  WS1:
    type: Workstation
    inputs:
      ServiceTime: { dist: { type: Triangular, min: 8, mode: 10, max: 15 } }
  SNK: { type: EntitySink }
links:
  - { from: SRC, to: BUF }
  - { from: BUF, to: WS1 }
  - { from: WS1, to: SNK }
globals:
  units: { time: s }
  rng: { seed: 1 }
  stopCondition: { time: 600 }
`;

export default function TextEditor() {
  const [text, setText] = useState(EXAMPLE);
  const [status, setStatus] = useState<string>('');
  const setGraph = useModelStore(s => s.setGraph);

  const load = async () => {
    try {
      setStatus('Uploading…');
      const modelObj = parseModel(text);
      const g = toGraph(modelObj);
      setGraph(g.nodes, g.links);
      await apiLoadModelFromText(text);
      setStatus('Model loaded ✔');
    } catch (e:any) {
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <div style={{ padding:8, borderTop:'1px solid #eee' }}>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <b>Model (YAML/JSON)</b>
        <button onClick={load}>Load model</button>
        <span style={{ fontSize:12, color:'#666' }}>{status}</span>
      </div>
      <textarea
        value={text}
        onChange={(e)=>setText(e.target.value)}
        rows={14}
        style={{ width:'100%', fontFamily:'monospace', marginTop:6 }}
        spellCheck={false}
      />
    </div>
  );
}
