
import React, { useEffect, useRef, useState } from 'react';
import Palette from './components/Palette';
import Toolbar from './components/Toolbar';
import OutputPanel from './components/OutputPanel';
import TextEditor from './components/TextEditor';
import { WsClient } from './lib/wsClient';
import Canvas2D from './components/Canvas2D';
import Inspector from './components/Inspector';
import StatusBar from './components/StatusBar';
import { useModelStore } from './store/useModelStore';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{name:string,t:number,v:number}[]>([]);
  const [online, setOnline] = useState(false);
  const applySnap = useModelStore(s => s.applyStateSnapshot);
  const wsRef = useRef<WsClient | null>(null);

  useEffect(() => {
    const ws = new WsClient({
      onLog:   (m)=> setLogs((prev)=> [...prev, `[${m.at}] ${m.msg}`].slice(-500)),
      onMetric:(m)=> setMetrics((prev)=> [...prev, ...(m.series||[])].slice(-1000)),
      onState: (m)=> {
        if (m.components) applySnap(m.components);
        setLogs((prev)=> [...prev, `[STATE] t=${m.simTime} running=${m.running}`].slice(-500));
      },
      onError: (m)=> setLogs((prev)=> [...prev, `[ERROR] ${m.msg}`].slice(-500)),
      onOpenChange: setOnline,
    });
    ws.connect();
    wsRef.current = ws;

    const onVis = () => { if (!document.hidden && !online) ws.reconnect(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      <Palette />
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <StatusBar online={online} env={import.meta.env.MODE} onReconnect={()=>wsRef.current?.reconnect()} />
        <Toolbar />
        <div style={{ display:'flex', minHeight: 300 }}>
          <Canvas2D />
          <Inspector />
        </div>
        <TextEditor />
        <OutputPanel logs={logs} metrics={metrics} />
      </div>
    </div>
  );
}
