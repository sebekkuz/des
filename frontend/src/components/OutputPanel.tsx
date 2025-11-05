
import React, { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip
} from 'chart.js'
import { useModelStore } from '../store/useModelStore'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip)

export default function OutputPanel(){
  const logs = useModelStore(s=>s.logs)
  const series = useModelStore(s=>s.series)

  const data = useMemo(()=>{
    const labels = Object.values(series)[0]?.t?.map(v=>v.toFixed(0)) || []
    const ds = Object.entries(series).map(([name,arr])=>({
      label: name, data: arr.v, tension: 0.2, fill: false
    }))
    return { labels, datasets: ds }
  }, [series])

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:8}}>
      <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
        <div style={{fontWeight:600, marginBottom:8}}>Metrics</div>
        <Line data={data} />
      </div>
      <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, maxHeight:280, overflow:'auto'}}>
        <div style={{fontWeight:600, marginBottom:8}}>Logs</div>
        <pre style={{whiteSpace:'pre-wrap', margin:0}}>{logs.join('\n')}</pre>
      </div>
    </div>
  )
}
