import React, { useEffect, useRef, useState } from 'react';
import Palette from './components/Palette';
import Toolbar from './components/Toolbar';
import OutputPanel from './components/OutputPanel';
import TextEditor from './components/TextEditor';
import { WsClient } from './lib/wsClient';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{name:string,t:number,v:number}[]>([]);
  const wsRef = useRef<WsClient|null>(null);

  useEffect(() => {
    const ws = new WsClient({
      onLog:   (m)=> setLogs((prev)=> [...prev, `[${m.at}] ${m.msg}`].slice(-500)),
      onMetric:(m)=> setMetrics((prev)=> [...prev, ...(m.series||[])].slice(-1000)),
      onState: (m)=> setLogs((prev)=> [...prev, `[STATE] t=${m.simTime} running=${m.running}`].slice(-500)),
      onError: (m)=> setLogs((prev)=> [...prev, `[ERROR] ${m.msg}`].slice(-500)),
    });
    ws.connect();
    wsRef.current = ws;
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      <Palette />
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <Toolbar />
        <div style={{ flex:1, background:'#eee', margin:8 }} />
        <TextEditor />
        <OutputPanel logs={logs} metrics={metrics} />
      </div>
    </div>
  );
}
