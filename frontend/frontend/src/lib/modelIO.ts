// frontend/src/lib/modelIO.ts
import { HTTP_URL } from './config';

export async function apiLoadModel(text?: string): Promise<void> {
  try {
    let payload = text;
    if (!payload) {
      const ta = document.getElementById('model-editor') as HTMLTextAreaElement | null;
      payload = (ta?.value || '').trim();
    }
    if (!payload) throw new Error('Model text is empty.');

    const res = await fetch(`${HTTP_URL}/api/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json())?.error ?? ''; } catch {}
      throw new Error(`Load failed: ${res.status} ${detail}`);
    }
    alert('Model loaded ✔');
    console.log('[MODEL] loaded');
  } catch (e: any) {
    alert(`Load model failed ✖\n${e?.message || e}`);
    console.error(e);
  }
}

export async function apiStart(): Promise<void> { await post('/api/start'); }
export async function apiPause(): Promise<void> { await post('/api/pause'); }
export async function apiReset(): Promise<void> { await post('/api/reset'); }
export async function apiSetParam(id: string, key: string, value: any): Promise<void> {
  await post('/api/setParam', { id, key, value });
}

async function post(path: string, body?: any) {
  const res = await fetch(`${HTTP_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error ?? ''; } catch {}
    throw new Error(`${path} failed: ${res.status} ${detail}`);
  }
}
