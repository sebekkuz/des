import { HTTP_URL } from './config';

export async function apiLoadModelFromText(text: string) {
  const res = await fetch(`${HTTP_URL}/api/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text
  });
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  return await res.json();
}

export async function apiStart() { return fetch(`${HTTP_URL}/api/start`, { method:'POST' }); }
export async function apiPause() { return fetch(`${HTTP_URL}/api/pause`, { method:'POST' }); }
export async function apiReset() { return fetch(`${HTTP_URL}/api/reset`, { method:'POST' }); }
