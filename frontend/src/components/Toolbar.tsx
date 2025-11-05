
import React from 'react'
import { apiLoadModel, apiStart, apiPause, apiReset } from '../lib/modelIO'
import { useModelStore } from '../store/useModelStore'

export default function Toolbar(){
  const running = useModelStore(s=>s.running)
  const simTime = useModelStore(s=>s.simTime)

  const onLoad = async () => {
    const ta = document.getElementById('model-editor') as HTMLTextAreaElement | null
    if(!ta) return alert('Editor not found')
    try {
      await apiLoadModel(ta.value)
      alert('Model loaded ✔')
    } catch(e:any){ alert('Load failed\n'+(e?.message||e)) }
  }
  return (
    <div style={{display:'flex', gap:8, padding:8, borderBottom:'1px solid #e5e7eb', alignItems:'center'}}>
      <button onClick={onLoad}>Load model</button>
      <button onClick={()=>apiStart().catch(e=>alert(e))}>Start</button>
      <button onClick={()=>apiPause().catch(e=>alert(e))}>Pause</button>
      <button onClick={()=>apiReset().catch(e=>alert(e))}>Reset</button>
      <div style={{marginLeft:'auto', color:'#555'}}>t={simTime.toFixed(1)}s · {running? 'RUNNING':'PAUSED'}</div>
    </div>
  )
}
