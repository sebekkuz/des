// frontend/src/App.tsx
import React, { useEffect } from "react";
import Toolbar from "./components/Toolbar";
import Canvas2D from "./components/Canvas2D";
import { useModelStore } from "./lib/store";

export default function App() {
  const setComponents = useModelStore(s => s.setComponents);
  const setSim = useModelStore(s => s.setSim);

  useEffect(() => {
    const url = import.meta.env.VITE_BACKEND_WS_URL;
    const ws = new WebSocket(url);
    ws.onopen = () => console.log("[WS] open");
    ws.onclose = () => console.log("[WS] close");
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "STATE") {
        if (msg.components) setComponents(msg.components);
        setSim({ running: !!msg.running, t: msg.simTime });
      }
      if (msg.type === "ERROR") console.error("[SIM ERROR]", msg.msg);
      if (msg.type === "LOG") console.log("[SIM LOG]", msg.msg);
    };
    return () => ws.close();
  }, [setComponents, setSim]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar />
      <div style={{ flex: 1, borderTop: "1px solid #eee" }}>
        <Canvas2D />
      </div>
      <div style={{ padding: 8, borderTop: "1px solid #eee" }}>
        <b>Model (JSON):</b>
        <textarea id="model-editor" rows={8} style={{ width: "100%" }} defaultValue={`{
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
}`} />
      </div>
    </div>
  );
}
