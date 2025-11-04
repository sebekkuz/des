import { HTTP_URL } from './config';
import { parse as parseYaml } from 'yaml';

export async function apiLoadModelFromText(text: string) {
  // Spróbuj sparsować YAML → obiekt. Jeśli to już JSON, też zadziała.
  let payload: any;
  try {
    payload = parseYaml(text);
  } catch {
    try { payload = JSON.parse(text); }
    catch (e) { throw new Error('Model is not valid YAML/JSON'); }
  }

  const res = await fetch(`${HTTP_URL}/api/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  return await res.json();
}

export async function apiStart() { return fetch(`${HTTP_URL}/api/start`, { method:'POST' }); }
export async function apiPause() { return fetch(`${HTTP_URL}/api/pause`, { method:'POST' }); }
export async function apiReset() { return fetch(`${HTTP_URL}/api/reset`, { method:'POST' }); }
