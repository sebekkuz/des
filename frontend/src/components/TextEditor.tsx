import React, { useState } from 'react';
import { apiLoadModelFromText } from '../lib/modelIO';

const EXAMPLE = `define:
  SRC:
    type: EntityGenerator
    inputs:
      InterarrivalTime:
        dist: { type: Exponential, mean: 12 }
      EntityType: Part
  BUF: { type: Buffer, inputs: { Capacity: 50 } }
  WS1:
    type: Workstation
    inputs:
      ServiceTime: { dist: { type: Triangular, min: 8, mode: 10, max: 15 } }
  QC: { type: QualityCheck, inputs: { RejectProb: 0.06 } }
  REW:
    type: Rework
    inputs:
      ServiceTime: { dist: { type: Uniform, min: 20, max: 40 } }
      MaxLoops: 1
  SNK: { type: EntitySink }
links:
  - { from: SRC, to: BUF }
  - { from: BUF, to: WS1 }
  - { from: WS1, to: QC }
  - { from: QC, to: REW, condition: { expr: "reject" } }
  - { from: QC, to: SNK, condition: { expr: "ok" } }
  - { from: REW, to: QC }
globals:
  units: { time: s }
  rng: { seed: 12345 }
  warmup: 60
  stopCondition: { time: 3600 }
`;

export default function TextEditor() {
  const [text, setText] = useState(EXAMPLE);
  const [status, setStatus] = useState<string>('');

  const load = async () => {
    try {
      setStatus('Uploading…');
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
