import React from 'react'
import { apiLoadModel, apiStart, apiPause, apiReset } from '../lib/modelIO'
import { useModelStore } from '../store/useModelStore'

export default function Toolbar(){
  const running = useModelStore(s=>s.running)
  const simTime = useModelStore(s=>s.simTime)

  const onLoad = async () => {
    console.log('[UI] Load clicked')
    const ta = document.getElementById('model-editor') as HTMLTextAreaElement | null
    if(!ta) { alert('Editor not found'); return }
    try {
      const res = await apiLoadModel(ta.value)
      console.log('[API] /api/load ok', res)
      alert('Model loaded ✔')
    } catch(e:any){
      console.error('[API] /api/load failed', e)
      alert('Load failed\\n' + (e?.message||e))
    }
  }
  const wrap = (fn:()=>Promise<any>) => async () => {
    try { console.log('[UI] click'); const r = await fn(); console.log('[API] ok', r) }
    catch(e){ console.error('[API] error', e); alert(String(e)) }
  }

  return (
    <div style={{display:'flex', gap:8, padding:8, borderBottom:'1px solid #e5e7eb', alignItems:'center'}}>
      <button onClick={onLoad}>Load model</button>
      <button onClick={wrap(apiStart)}>Start</button>
      <button onClick={wrap(apiPause)}>Pause</button>
      <button onClick={wrap(apiReset)}>Reset</button>
      <div style={{marginLeft:'auto', color:'#555'}}>t={simTime.toFixed(1)}s · {running? 'RUNNING':'PAUSED'}</div>
    </div>
  )
}
