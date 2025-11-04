
import React from 'react';
import { apiStart, apiPause, apiReset, apiLoadModel } from '../lib/modelIO';
export default function Toolbar(){
  const saveScenario=()=>{ const ta=document.getElementById('model-editor') as HTMLTextAreaElement|null; if(!ta) return; localStorage.setItem('scenario', ta.value); alert('Scenario saved.'); };
  const loadScenario=()=>{ const ta=document.getElementById('model-editor') as HTMLTextAreaElement|null; if(!ta) return; const v=localStorage.getItem('scenario')||''; if(v){ ta.value=v; alert('Loaded. Click "Load model".'); } else alert('No saved scenario.'); };
  return (<div style={{display:'flex', gap:8, padding:8, borderBottom:'1px solid #eee', background:'#fff'}}>
    <button onClick={()=>apiLoadModel()}>Load model</button>
    <button onClick={()=>apiStart()}>Start</button>
    <button onClick={()=>apiPause()}>Pause</button>
    <button onClick={()=>apiReset()}>Reset</button>
    <div style={{flex:1}}/>
    <button onClick={saveScenario}>Save scenario</button>
    <button onClick={loadScenario}>Load scenario</button>
  </div>);
}
