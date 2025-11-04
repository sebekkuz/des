
import React from 'react';
import { HTTP_URL } from '../lib/config';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Tooltip, Legend
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Tooltip, Legend);

type Pt = { name:string, t:number, v:number };
export default function OutputPanel({ logs, metrics }:{ logs:string[], metrics:Pt[] }) {
  const mk = (name:string) => metrics.filter(m => m.name === name).map(m => ({ x:m.t, y:m.v }));
  const data = {
    labels: mk('throughput_cum').map(p => p.x),
    datasets: [
      { label:'Throughput (cum)', data: mk('throughput_cum').map(p=>p.y) },
      { label:'WIP_avg', data: mk('WIP_avg').map(p=>p.y) },
      { label:'Util_avg', data: mk('Util_avg').map(p=>p.y) },
      { label:'Scrap_rate', data: mk('Scrap_rate').map(p=>p.y) },
    ]
  };
  const dl = () => { window.open(`${HTTP_URL}/api/export/metrics`, '_blank'); };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:8, height: 300 }}>
      <div style={{ border:'1px solid #eee', padding:8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <b>Metrics</b>
          <button onClick={dl}>Export CSV</button>
        </div>
        <div>
          <Line data={data as any} options={{ responsive:true, animation:false, plugins:{ legend:{ display:true } }, scales:{ x:{ display:true }, y:{ display:true } } }} />
        </div>
      </div>
      <div style={{ border:'1px solid #eee', padding:8, overflow:'auto' }}>
        <b>Logs</b>
        <pre style={{ fontSize:11, lineHeight:'16px' }}>{logs.join('\n')}</pre>
      </div>
    </div>
  );
}
