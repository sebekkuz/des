// frontend/src/components/Toolbar.tsx
import React from "react";

const HTTP_URL = import.meta.env.VITE_BACKEND_HTTP_URL;

async function apiLoadModel() {
  const ta = document.getElementById("model-editor") as HTMLTextAreaElement | null;
  const body = ta?.value?.trim() || "";
  if (!body) { alert("Model text is empty"); return; }
  const res = await fetch(`${HTTP_URL}/api/load`, {
    method: "POST",
    // ⬇️ kluczowa zmiana:
    headers: { "Content-Type": "text/plain" },
    body // surowy tekst, JSON lub YAML
  });
  if (!res.ok) {
    let txt = "";
    try { txt = JSON.stringify(await res.json()); } catch {}
    throw new Error(`/api/load failed ${res.status} ${txt}`);
  }
  alert("Model loaded ✔");
}

async function post(path: string) {
  const res = await fetch(`${HTTP_URL}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${path} failed ${res.status}`);
}

export default function Toolbar() {
  return (
    <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #eee" }}>
      <button onClick={apiLoadModel}>Load model</button>
      <button onClick={() => post("/api/start")}>Start</button>
      <button onClick={() => post("/api/pause")}>Pause</button>
      <button onClick={() => post("/api/reset")}>Reset</button>
    </div>
  );
}
