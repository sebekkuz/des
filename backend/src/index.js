// backend/src/index.js
// ESM (package.json ma "type":"module")

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { parse as parseYaml } from 'yaml';

import { loadModel } from './model/loader.js';
import { Engine } from './sim/engine.js';

const app = express();

/**
 * ----------- CORS (MUSI być PRZED parserami i trasami) -----------
 * Jeśli chcesz ograniczyć do konkretnego frontu, ustaw zmienną środowiskową:
 * FRONT_ORIGIN=https://twoj-front.onrender.com
 */
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONT_ORIGIN);
  res.setHeader('Vary', 'Origin'); // dobre przy cache/proxy
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Jeśli kiedyś użyjesz cookies/sessions, odkomentuj i ustaw FRONT_ORIGIN != '*'
  // res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

/**
 * ----------- Parsery body -----------
 * Front wysyła JSON (Content-Type: application/json).
 * Dodatkowo pozwalamy na YAML jako czysty tekst (application/x-yaml / text/*).
 */
app.use(express.json({ limit: '2mb' }));
app.use(
  express.text({
    type: ['text/*', 'application/yaml', 'application/x-yaml'],
    limit: '2mb',
  })
);

// Inicjalizacja silnika i stanu
let engine = null;       // Engine
let modelDef = null;     // Ostatnio załadowany model (obiekt JS po walidacji)
let wss = null;          // WebSocketServer

// Pomocnicze: broadcast do wszystkich WS
function wsBroadcast(obj) {
  if (!wss) return;
  const msg = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    try {
      if (client.readyState === 1) client.send(msg);
    } catch {}
  });
}

// REST: health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// REST: load – przyjmuje JSON lub YAML (string) i buduje silnik
app.post('/api/load', async (req, res) => {
  try {
    let src = req.body;

    // Jeśli przyszedł tekst (YAML), zamień na obiekt:
    if (typeof src === 'string') {
      try {
        src = parseYaml(src);
      } catch (e) {
        // może to był JSON jako string
        try {
          src = JSON.parse(src);
        } catch {
          return res.status(400).json({ error: 'Body must be valid YAML or JSON' });
        }
      }
    }

    // Walidacja + normalizacja modelu (Zod) – loader przyjmuje obiekt lub tekst
    modelDef = loadModel(src);

    // Zrestartuj silnik z nowym modelem
    if (engine) {
      engine.pause();
      engine.reset();
    }
    engine = new Engine({
      onState: (state) => wsBroadcast({ type: 'STATE', ...state }),
      onMetric: (series) => wsBroadcast({ type: 'METRIC', series }),
      onLog: (entry) => wsBroadcast({ type: 'LOG', ...entry }),
      onError: (err) => wsBroadcast({ type: 'ERROR', msg: String(err) }),
    });

    // Załaduj model do silnika (prosty loader – zależnie od Twojej implementacji)
    if (engine.loadModel) {
      engine.loadModel(modelDef);
    }

    wsBroadcast({ type: 'LOG', level: 'info', msg: 'Model loaded', at: Date.now() });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[LOAD] error', err);
    return res.status(422).json({ error: String(err?.message || err) });
  }
});

// REST: start
app.post('/api/start', (req, res) => {
  try {
    if (!engine) return res.status(400).json({ error: 'No model loaded' });
    engine.start();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[START] error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// REST: pause
app.post('/api/pause', (req, res) => {
  try {
    if (!engine) return res.status(400).json({ error: 'No model loaded' });
    engine.pause();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PAUSE] error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// REST: reset
app.post('/api/reset', (req, res) => {
  try {
    if (!engine) return res.status(400).json({ error: 'No model loaded' });
    engine.reset();
    wsBroadcast({ type: 'STATE', simTime: 0, running: false });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[RESET] error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// HTTP server + WebSocket
const server = http.createServer(app);

// WebSocket path: /ws
wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  try {
    socket.send(JSON.stringify({ type: 'HELLO', version: '0.0.1' }));
    if (engine) {
      socket.send(JSON.stringify({ type: 'STATE', simTime: engine.simTime || 0, running: !!engine.running }));
    }
  } catch {}
});

// Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
