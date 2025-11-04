
import React, { useState } from 'react';
import { HTTP_URL } from '../lib/config';
export default function ExperimentsPanel(){
  const [rep,setRep]=useState(5); const [seed,setSeed]=useState(123); const [stop,setStop]=useState(600);
  const [rows,setRows]=useState<any[]>([]); const [sum,setSum]=useState<any>(null);
  const run=async()=>{
    try{
      const ed=document.getElementById('model-editor') as HTMLTextAreaElement|null;
      const body={ model: ed?.value||'', replications: rep, seed, stopTime: stop };
      const res=await fetch(`${HTTP_URL}/api/experiments`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
      const js=await res.json(); setRows(js.results||[]); setSum(js.summary||null);
    }catch(e:any){ alert('Experiments failed: '+e.message); }
  };
  return (<div style={{borderTop:'1px solid #eee', padding:8}}>
    <b>Experiments</b>
    <div style={{display:'flex', gap:8, marginTop:8}}>
      <label>Reps <input type="number" value={rep} onChange={e=>setRep(Number(e.target.value))} style={{width:80}}/></label>
      <label>Seed <input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))} style={{width:120}}/></label>
      <label>Stop t[s] <input type="number" value={stop} onChange={e=>setStop(Number(e.target.value))} style={{width:120}}/></label>
      <button onClick={run}>Run</button>
    </div>
    {sum && <div style={{marginTop:8, fontSize:13}}>Summary: OEE={sum.avg_OEE?.toFixed(3)} A={sum.avg_A?.toFixed(3)} P={sum.avg_P?.toFixed(3)} Q={sum.avg_Q?.toFixed(3)} Thru={sum.avg_Throughput?.toFixed(2)}</div>}
    <div style={{marginTop:8, maxHeight:180, overflow:'auto'}}>
      <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
        <thead><tr><th>#</th><th>OEE</th><th>A</th><th>P</th><th>Q</th><th>Thru</th></tr></thead>
        <tbody>{rows.map((r,i)=>(<tr key={i}><td>{i+1}</td><td>{r.OEE?.toFixed(3)}</td><td>{r.A?.toFixed(3)}</td><td>{r.P?.toFixed(3)}</td><td>{r.Q?.toFixed(3)}</td><td>{r.throughput?.toFixed(2)}</td></tr>))}</tbody>
      </table>
    </div>
  </div>);
}
