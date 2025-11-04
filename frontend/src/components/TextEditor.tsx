
import React from 'react';
import { useModelStore } from '../store/useModelStore';
export default function TextEditor(){
  const text=useModelStore(s=>s.modelText);
  const setText=useModelStore(s=>s.setModelText);
  return (<div style={{padding:8, borderTop:'1px solid #eee'}}>
    <b>Model (JSON or YAML)</b>
    <textarea id="model-editor" value={text} onChange={e=>setText(e.target.value)} rows={10}
      style={{width:'100%', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace'}} />
  </div>);
}
