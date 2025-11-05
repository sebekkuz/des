
import React, { useEffect, useRef } from 'react'
import { useModelStore } from '../store/useModelStore'

export default function Canvas2D(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null)
  const components = useModelStore(s=>s.components)
  const running = useModelStore(s=>s.running)
  const t = useModelStore(s=>s.simTime)

  useEffect(()=>{
    const cvs = canvasRef.current
    if(!cvs) return
    const ctx = cvs.getContext('2d')
    if(!ctx) return
    const r = cvs.getBoundingClientRect()
    const d = window.devicePixelRatio||1
    cvs.width = r.width*d; cvs.height = r.height*d; ctx.setTransform(d,0,0,d,0,0)
    ctx.clearRect(0,0,r.width,r.height)
    ctx.fillStyle='#fafbfc'; ctx.fillRect(0,0,r.width,r.height)

    const ids = Object.keys(components)
    ids.forEach((id, i)=>{
      const x = 40 + i*160
      const y = 60
      ctx.fillStyle = running ? '#c8e6c9' : '#e3f2fd'
      ctx.strokeStyle = '#37474f'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.rect(x, y, 130, 64); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#263238'; ctx.font='12px monospace'
      ctx.fillText(`${id}`, x+8, y+18)
      ctx.fillStyle='#546e7a'; ctx.fillText(`${components[id]?.type||'?'}`, x+8, y+38)
    })
    ctx.fillStyle='#9e9e9e'; ctx.font='11px monospace'
    ctx.fillText(`t=${t.toFixed(1)}s`, 10, r.height-10)
  }, [components, running, t])

  return <canvas ref={canvasRef} style={{width:'100%', height:'420px', display:'block'}} />
}
