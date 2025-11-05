import buildApiRouter from './apiPatch.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { loadModel } from './model/loader.js';
import { Engine } from './sim/engine.js';


// Configure CORS to only allow the frontend domain.  The domain is set via
// environment variable FRONT_ORIGIN or defaults to the production frontend.
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'https://des-1-sjna.onrender.com';
app.use(cors({
  origin: FRONT_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use('/api', buildApiRouter(engine));
// In-memory model and engine instance.  For a real deployment, consider
// supporting multiple concurrent simulations identified by ID.
let engine = null;

// REST endpoints
app.post('/api/load', (req, res) => {
  try {
    const model = loadModel(req.body);
    engine = new Engine(model);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/start', (_req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  engine.start();
  res.json({ ok: true });
});

app.post('/api/pause', (_req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  engine.pause();
  res.json({ ok: true });
});

app.post('/api/reset', (_req, res) => {
  if (!engine) return res.status(400).json({ error: 'No model loaded' });
  engine.reset();
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Create HTTP server and WS server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Broadcast simulation state periodically
function broadcastState() {
  if (!engine) return;
  const state = engine.getState();
  const msg = JSON.stringify({ type: 'STATE', data: state });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(msg);
  });
}

setInterval(broadcastState, 1000);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'HELLO', data: { version: '0.0.1' } }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
