
// backend/src/index.js (A+B+C)
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { parse as parseYaml } from 'yaml';

import { loadModel } from './model/loader.js';
import { Engine } from './sim/engine.js';

const app = express();
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
let wss = null;

function wsBroadcast(obj) {
  if (!wss) return;
  const msg = JSON.stringify(obj);
  wss.clients.forEach((c) => { try { if (c.readyState === 1) c.send(msg); } catch {} });
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/load', (req, res) => {
  try {
    let src = req.body;
    if (typeof src === 'string') {
      try { src = JSON.parse(src); }
      catch { src = parseYaml(src); }
    }
    const modelDef = loadModel(src);

    if (engine) { engine.pause(); engine.reset(); }
    engine = new Engine({
      onState:  (state) => wsBroadcast({ type:'STATE', ...state }),
      onMetric: (series) => wsBroadcast({ type:'METRIC', series }),
      onLog:    (entry) => wsBroadcast({ type:'LOG', ...entry }),
      onError:  (err) => wsBroadcast({ type:'ERROR', msg:String(err) }),
      onEntityMove: (m) => wsBroadcast({ type:'ENTITY_MOVE', ...m }),
    });
    engine.loadModel(modelDef);
    wsBroadcast({ type:'LOG', level:'info', msg:'Model loaded', at:Date.now() });
    res.json({ ok: true });
  } catch (e) {
    console.error('[LOAD]', e);
    res.status(422).json({ error: String(e?.message || e) });
  }
});

app.post('/api/setParam', (req, res) => {
  try {
    const { id, key, value } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!engine) return res.status(400).json({ error:'No model loaded' });
    engine.applyParam(id, key, value);
    res.json({ ok:true });
  } catch (e) {
    res.status(400).json({ error:String(e?.message || e) });
  }
});

app.post('/api/start', (req,res) => {
  if (!engine) return res.status(400).json({ error:'No model loaded' });
  engine.start(); res.json({ ok:true });
});
app.post('/api/pause', (req,res) => {
  if (!engine) return res.status(400).json({ error:'No model loaded' });
  engine.pause(); res.json({ ok:true });
});
app.post('/api/reset', (req,res) => {
  if (!engine) return res.status(400).json({ error:'No model loaded' });
  engine.reset(); wsBroadcast({ type:'STATE', simTime:0, running:false }); res.json({ ok:true });
});

// CSV export of metric series
app.get('/api/export/:name', (req, res) => {
  if (!engine) return res.status(400).json({ error:'No model loaded' });
  const name = String(req.params.name || 'metrics');
  const rows = [['name','t','v']];
  for (const s of engine.series) rows.push([s.name, s.t, s.v]);
  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.end(csv);
});

const server = http.createServer(app);
wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'HELLO', version: '0.0.3' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
