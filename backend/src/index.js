// backend/src/index.js (Patch 1: safe /api/load + robust error handling)
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { parse as parseYaml } from 'yaml';

import { loadModel } from './model/loader.js';
import { Engine } from './sim/engine.js';

const app = express();

// CORS: use FRONT_ORIGIN env (set to * during tests if needed)
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONT_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['text/*','application/yaml','application/x-yaml'], limit: '2mb' }));

let engine = null;
let _wss = null;
function wsBroadcast(obj) {
  if (!_wss) return;
  const msg = JSON.stringify(obj);
  _wss.clients.forEach(c => { try { if (c.readyState === 1) c.send(msg); } catch {} });
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- SAFE /api/load ----
app.post('/api/load', (req, res) => {
  try {
    let src = req.body;
    if (typeof src === 'string') {
      try { src = JSON.parse(src); }
      catch { src = parseYaml(src); }
    }
    const modelDef = loadModel(src);

    // DO NOT assume previous engine shape
    if (engine && typeof engine.pause === 'function') {
      try { engine.pause(); } catch {}
      if (typeof engine.reset === 'function') {
        try { engine.reset(); } catch {}
      }
    }

    engine = new Engine({
      onState:  (state)  => wsBroadcast({ type: 'STATE',  ...state }),
      onMetric: (series) => wsBroadcast({ type: 'METRIC', series }),
      onLog:    (entry)  => wsBroadcast({ type: 'LOG',    ...entry }),
      onError:  (err)    => wsBroadcast({ type: 'ERROR',  msg: String(err) }),
      onEntityMove: (m)  => wsBroadcast({ type: 'ENTITY_MOVE', ...m }),
    });

    engine.loadModel(modelDef);
    wsBroadcast({ type:'LOG', level:'info', msg:'Model loaded', at:Date.now() });
    return res.json({ ok: true });

  } catch (e) {
    const msg = String(e?.message || e);
    console.error('[LOAD]', msg);
    return res.status(422).json({ error: msg });
  }
});

app.post('/api/start', (req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  engine.start();
  res.json({ ok: true });
});

app.post('/api/pause', (req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  if (typeof engine.pause === 'function') engine.pause();
  res.json({ ok: true });
});

app.post('/api/reset', (req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  if (typeof engine.reset === 'function') engine.reset();
  wsBroadcast({ type:'STATE', simTime:0, running:false });
  res.json({ ok: true });
});

// Optional param setting (kept as-is if already present)
app.post('/api/setParam', (req, res) => {
  try {
    const { id, key, value } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!engine) return res.status(400).json({ error: 'No model loaded' });
    if (typeof engine.applyParam === 'function') engine.applyParam(id, key, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e) });
  }
});

// CSV export of metric series (if implemented by engine)
app.get('/api/export/:name', (req, res) => {
  if (!engine) return res.status(400).json({ error:'No model loaded' });
  const name = String(req.params.name || 'metrics');
  const rows = [['name','t','v']];
  const series = engine.series || [];
  for (const s of series) rows.push([s.name, s.t, s.v]);
  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.end(csv);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
_wss = wss;
wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'HELLO', version: '0.0.6' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
