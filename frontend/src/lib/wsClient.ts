
import { useModelStore } from '../store/useModelStore'

export function connectWS() {
  const url = import.meta.env.VITE_BACKEND_WS_URL
  if (!url) {
    console.error('VITE_BACKEND_WS_URL is not defined')
    return () => {}
  }
  const pushLog = useModelStore.getState().pushLog
  const setSim = useModelStore.getState().setSim
  const setComponents = useModelStore.getState().setComponents
  const pushMetrics = useModelStore.getState().pushMetrics

  const ws = new WebSocket(url)
  ws.onopen = () => { console.log('[WS] open'); pushLog('[WS] open') }
  ws.onclose = () => { console.log('[WS] close'); pushLog('[WS] close') }
  ws.onerror = (e) => { console.error('[WS] error', e); pushLog('[WS] error') }
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      switch (msg.type) {
        case 'HELLO': pushLog('HELLO: ' + (msg.msg || '')); break
        case 'LOG':   pushLog(`[${new Date(msg.at||Date.now()).toISOString()}] ${msg.msg}`); break
        case 'STATE':
          if (typeof msg.simTime === 'number') setSim(msg.simTime, !!msg.running)
          if (msg.components) setComponents(msg.components)
          break
        case 'METRIC':
          if (Array.isArray(msg.series)) pushMetrics(msg.series)
          break
        default: break
      }
    } catch (e) {
      console.error('WS parse error', e)
    }
  }
  return () => ws.close()
}
