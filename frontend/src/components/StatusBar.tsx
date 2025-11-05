
import React from 'react'
import { useModelStore } from '../store/useModelStore'

export default function StatusBar(){
  const running = useModelStore(s=>s.running)
  const t = useModelStore(s=>s.simTime)
  const online = true

  return (
    <div style={{padding:8, borderTop:'1px solid #e5e7eb', display:'flex', gap:12}}>
      <span style={{fontWeight:600}}>Status:</span>
      <span>{online? 'ONLINE':'OFFLINE'}</span>
      <span>·</span>
      <span>t={t.toFixed(1)}s</span>
      <span>·</span>
      <span>{running? 'RUNNING':'PAUSED'}</span>
      <span style={{marginLeft:'auto', color:'#667085'}}>HTTP: {import.meta.env.VITE_BACKEND_HTTP_URL} | WS: {import.meta.env.VITE_BACKEND_WS_URL}</span>
    </div>
  )
}
