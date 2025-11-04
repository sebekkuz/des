import React from 'react';

type Props = { logs: string[]; metrics: {name:string,t:number,v:number}[] };

export default function OutputPanel({ logs, metrics }: Props) {
  return (
    <div style={{ borderTop:'1px solid #ddd', padding:8, height:180, overflow:'auto' }}>
      <b>Output</b>
      <div style={{ display:'flex', gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, marginTop:6 }}>Logs</div>
          <pre style={{ fontSize:12, background:'#f8f8f8', padding:8 }}>
            {logs.join('\n')}
          </pre>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, marginTop:6 }}>Metrics (sample)</div>
          <pre style={{ fontSize:12, background:'#f8f8f8', padding:8 }}>
            {metrics.slice(-10).map(m => `${m.t}: ${m.name}=${m.v}`).join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}
