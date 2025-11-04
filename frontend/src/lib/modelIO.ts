// frontend/src/lib/modelIO.ts
import { HTTP_URL } from './config';

/**
 * Wysyła model do backendu. Jeśli `text` nie podano, pobiera z textarea #model-editor.
 * Akceptuje JSON lub YAML — backend sam rozpozna.
 */
export async function apiLoadModel(text?: string): Promise<void> {
  try {
    let payload = text;
    if (!payload) {
      const ta = document.getElementById('model-editor') as HTMLTextAreaElement | null;
      if (!ta) throw new Error('Model editor not found (#model-editor).');
      payload = ta.value;
    }
    const res = await fetch(`${HTTP_URL}/api/load`, {
      method: 'POST',
      // wysyłamy jako zwykły tekst — backend ma parser JSON/YAML dla text/*
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    });
    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`Load failed: ${res.status} ${err?.error ?? ''}`);
    }
    console.log('[MODEL] loaded');
  } catch (e) {
    console.error(e);
    alert((e as Error).message || 'Load model failed');
  }
}

export async function apiStart(): Promise<void> {
  await simplePost('/api/start');
}
export async function apiPause(): Promise<void> {
  await simplePost('/api/pause');
}
export async function apiReset(): Promise<void> {
  await simplePost('/api/reset');
}

/** Ustawienie parametru komponentu z UI (opcjonalnie używane w Inspectorze) */
export async function apiSetParam(id: string, key: string, value: any): Promise<void> {
  await simplePost('/api/setParam', { id, key, value });
}

// ---------- helpers ----------
async function simplePost(path: string, body?: any) {
  const res = await fetch(`${HTTP_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(`${path} failed: ${res.status} ${err?.error ?? ''}`);
  }
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}
