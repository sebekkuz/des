
import { HTTP_URL } from './config';
import { parse as parseYaml } from 'yaml';

export function parseModel(text: string): any {
  // YAML first, then JSON
  try { return parseYaml(text); }
  catch {
    try { return JSON.parse(text); }
    catch { throw new Error('Model is not valid YAML/JSON'); }
  }
}

export async function apiLoadModelFromText(text: string) {
  const payload = parseModel(text);
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

export async function apiSetParam(id: string, key: string, value: any) {
  const res = await fetch(`${HTTP_URL}/api/setParam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, key, value })
  });
  if (!res.ok) throw new Error(`setParam failed: ${res.status}`);
  return await res.json();
}
