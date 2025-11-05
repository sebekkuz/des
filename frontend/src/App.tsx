import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import OutputPanel from './components/OutputPanel';

// Backend URLs are provided via Vite env variables
const HTTP_URL = import.meta.env.VITE_BACKEND_HTTP_URL || '';
const WS_URL = import.meta.env.VITE_BACKEND_WS_URL || '';

const App: React.FC = () => {
  const [modelText, setModelText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{ name: string; t: number; v: number }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!WS_URL) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('[WS] open');
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATE') {
          // handle state if needed
        } else if (msg.type === 'LOG') {
          setLogs((prev) => [...prev, `[${new Date(msg.at).toLocaleTimeString()}] ${msg.msg}`].slice(-200));
        } else if (msg.type === 'METRIC') {
          // append metrics series; assume series is an array of {name,t,v}
          if (msg.series) {
            setMetrics((prev) => [...prev, ...msg.series].slice(-500));
          }
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };
    ws.onclose = () => {
      console.log('[WS] close');
    };
    return () => {
      ws.close();
    };
  }, []);

  // Helper to call backend REST endpoints
  const callApi = async (path: string, body?: any) => {
    const res = await fetch(`${HTTP_URL}${path}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return res.json().catch(() => ({}));
  };

  const handleLoadModel = async () => {
    if (!modelText.trim()) {
      alert('Please enter a model definition');
      return;
    }
    try {
      // Post raw text; backend loader handles JSON/YAML
      const res = await fetch(`${HTTP_URL}/api/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: modelText,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      alert('Model loaded ✔');
      setLogs((prev) => [...prev, 'Model loaded'].slice(-200));
    } catch (err: any) {
      alert(`Load failed: ${err.message}`);
    }
  };

  const handleStart = async () => {
    try {
      await callApi('/api/start');
    } catch (err: any) {
      alert(`Start failed: ${err.message}`);
    }
  };
  const handlePause = async () => {
    try {
      await callApi('/api/pause');
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    }
  };
  const handleReset = async () => {
    try {
      await callApi('/api/reset');
      setLogs([]);
      setMetrics([]);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar palette */}
      <div style={{ width: '240px', borderRight: '1px solid #ccc', padding: '0.5rem' }}>
        <h3>Palette</h3>
        <p>Drag components into the canvas</p>
        {/* In this simplified version, palette is static */}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleLoadModel}>Load model</button>
          <button onClick={handleStart}>Start</button>
          <button onClick={handlePause}>Pause</button>
          <button onClick={handleReset}>Reset</button>
        </div>
        {/* Model text input */}
        <textarea
          placeholder="Paste JSON or YAML model here"
          value={modelText}
          onChange={(e) => setModelText(e.target.value)}
          rows={8}
          style={{ width: '100%', fontFamily: 'monospace', resize: 'vertical', padding: '0.5rem', border: '1px solid #ccc' }}
        />
        {/* 3D Canvas placeholder */}
        <div style={{ flex: 1, background: '#f0f0f0' }}>
          {/* Placeholder for 3D canvas or 2D canvas; we leave empty since focus is on metrics/logs */}
        </div>
        {/* Output panel */}
        <div style={{ height: '240px', borderTop: '1px solid #ccc' }}>
          <OutputPanel logs={logs} metrics={metrics} />
        </div>
      </div>
    </div>
  );
};

export default App;