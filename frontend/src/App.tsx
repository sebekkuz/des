
import React, { useEffect, useState } from 'react';
import Palette from './components/Palette';
import Toolbar from './components/Toolbar';
import OutputPanel from './components/OutputPanel';
import TextEditor from './components/TextEditor';
import { WsClient } from './lib/wsClient';
import Canvas2D from './components/Canvas2D';
import Inspector from './components/Inspector';
import { useModelStore } from './store/useModelStore';
import ExperimentsPanel from './components/ExperimentsPanel';

export default function App(){
  const [logs,setLogs]=useState<string[]>([]);
  const [metrics,setMetrics]=useState<{name:string,t:number,v:number}[]>([]);
  const applySnap=useModelStore(s=>s.applyStateSnapshot);
  useEffect(()=>{
    const ws=new WsClient({
      onLog:(m)=>setLogs(p=>[...p,`[${m.at}] ${m.msg}`].slice(-500)),
      onMetric:(m)=>setMetrics(p=>[...p,...(m.series||[])].slice(-2000)),
      onState:(m)=>{ if(m.components) applySnap(m.components); setLogs(p=>[...p,`[STATE] t=${m.simTime} running=${m.running}`].slice(-500)); },
      onError:(m)=>setLogs(p=>[...p,`[ERROR] ${m.msg}`].slice(-500)),
      onEntityMove:(m)=>window.dispatchEvent(new CustomEvent('ENTITY_MOVE',{detail:m})),
    }); ws.connect();
  },[]);
  return (<div style={{display:'flex', height:'100vh'}}>
    <Palette/>
    <div style={{flex:1, display:'flex', flexDirection:'column'}}>
      <Toolbar/>
      <div style={{display:'flex', minHeight:300}}><Canvas2D/><Inspector/></div>
      <TextEditor/>
      <ExperimentsPanel/>
      <OutputPanel logs={logs} metrics={metrics}/>
    </div>
  </div>);
}
