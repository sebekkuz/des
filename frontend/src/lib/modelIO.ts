
const HTTP = import.meta.env.VITE_BACKEND_HTTP_URL

async function post(path: string, init?: RequestInit) {
  const res = await fetch(`${HTTP}${path}`, { method: 'POST', ...(init||{}) })
  if (!res.ok) {
    let txt = ''
    try { txt = JSON.stringify(await res.json()) } catch {}
    throw new Error(`${path} ${res.status} ${txt}`)
  }
  return res.json().catch(()=>({ ok:true }))
}

export async function apiLoadModel(raw: string) {
  if (!raw || !raw.trim()) throw new Error('Empty model')
  return post('/api/load', {
    headers: { 'Content-Type': 'text/plain' },
    body: raw
  })
}
export async function apiStart() { return post('/api/start') }
export async function apiPause() { return post('/api/pause') }
export async function apiReset() { return post('/api/reset') }
