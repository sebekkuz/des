
import React from 'react'

export default function TextEditor(){
  const sample = `{
  "define": {
    "SRC": { "type": "EntityGenerator", "inputs": { "InterarrivalTime": { "dist": { "type": "Exponential", "mean": 1 } } } },
    "BUF": { "type": "Buffer", "inputs": { "Capacity": 20 } },
    "WS1": { "type": "Workstation", "inputs": { "m": 1, "ServiceTime": { "dist": { "type": "Triangular", "min": 6, "mode": 8, "max": 12 } } } },
    "QC":  { "type": "QualityCheck", "inputs": { "RejectProb": 0.06 } },
    "SNK": { "type": "EntitySink" }
  },
  "links": [
    { "from": "SRC", "to": "BUF" },
    { "from": "BUF", "to": "WS1" },
    { "from": "WS1", "to": "QC" },
    { "from": "QC",  "to": "SNK" }
  ],
  "globals": { "rng": { "seed": 123 }, "stopCondition": { "time": 300 } }
}`
  return (
    <div style={{padding:8}}>
      <div style={{fontWeight:600, marginBottom:6}}>Model (JSON lub YAML)</div>
      <textarea id="model-editor" style={{width:'100%', height:180}} defaultValue={sample} />
    </div>
  )
}
