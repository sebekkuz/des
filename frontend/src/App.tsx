import React from "react";
import { useModelStore } from "./lib/store";

export default function App() {
  const { setState } = useModelStore();
  React.useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_BACKEND_WS_URL);
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "STATE") {
        setState(msg.data);
        if (msg.data.components) {
          useModelStore.getState().setComponents(msg.data.components);
        }
      } else if (msg.type === "MODEL") {
        console.log("[MODEL] loaded");
      }
    };
    return () => ws.close();
  }, []);
  return <div>DES Simulation UI</div>;
}
