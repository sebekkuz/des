
import React, { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import Canvas2D from './components/Canvas2D'
import OutputPanel from './components/OutputPanel'
import TextEditor from './components/TextEditor'
import StatusBar from './components/StatusBar'
import { connectWS } from './lib/wsClient'

const App: React.FC = () => {
  useEffect(()=>{
    const close = connectWS()
    return () => { try{ close && close() }catch{} }
  }, [])

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <Toolbar />
      <div style={{display:'grid', gridTemplateRows:'440px auto', gap:8, padding:8}}>
        <Canvas2D />
        <OutputPanel />
        <TextEditor />
      </div>
      <StatusBar />
    </div>
  )
}

export default App
