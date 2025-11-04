
import React from 'react';

type Props = { online: boolean; env?: string; onReconnect?: () => void };

export default function StatusBar({ online, env, onReconnect }: Props) {
  return (
    <div style={{ height: 28, display:'flex', alignItems:'center', gap:12, padding:'0 8px', borderBottom:'1px solid #eee', background:'#fafafa' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:4, background: online ? '#16a34a' : '#ef4444' }} />
        <b>{online ? 'ONLINE' : 'OFFLINE'}</b>
      </span>
      {env && <span style={{ color:'#64748b' }}>{env}</span>}
      <div style={{ flex:1 }} />
      <button onClick={onReconnect}>Reconnect WS</button>
    </div>
  );
}
