
import express from 'express';
import YAML from 'yaml';

export default function buildApiRouter(engine){
  const router = express.Router();

  router.get('/health', (req, res) => res.json({ ok: true }));

  router.post('/load', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
    try {
      let raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      raw = (raw || '').trim();
      if (!raw) throw new Error('Empty body');

      let model;
      try {
        if (raw.startsWith('{') || raw.startsWith('[')) {
          model = JSON.parse(raw);
        } else {
          model = YAML.parse(raw);
        }
      } catch (e) {
        throw new Error('Parse error: ' + (e?.message || e));
      }

      if (!model || typeof model !== 'object' || !model.define) {
        throw new Error('Model missing "define" section.');
      }

      if (!engine || typeof engine.loadModel !== 'function') {
        return res.status(500).json({ error: 'engine.loadModel not available' });
      }
      await engine.loadModel(model);

      const components = {};
      if (engine.components instanceof Map) {
        for (const [id, comp] of engine.components.entries()) {
          components[id] = { type: comp?.type || comp?.constructor?.name || 'Component' };
        }
      }

      return res.json({ ok: true, msg: 'Model loaded', components });
    } catch (err) {
      return res.status(400).json({ error: String(err?.message || err) });
    }
  });

  router.post('/start', (req, res) => {
    if (!engine?.loaded) return res.status(400).json({ error: 'No model loaded' });
    if (typeof engine.start !== 'function') return res.status(500).json({ error: 'engine.start not available' });
    engine.start();
    res.json({ ok: true });
  });
  router.post('/pause', (req, res) => {
    if (!engine?.loaded) return res.status(400).json({ error: 'No model loaded' });
    if (typeof engine.pause !== 'function') return res.status(500).json({ error: 'engine.pause not available' });
    engine.pause();
    res.json({ ok: true });
  });
  router.post('/reset', (req, res) => {
    if (!engine?.loaded) return res.status(400).json({ error: 'No model loaded' });
    if (typeof engine.reset !== 'function') return res.status(500).json({ error: 'engine.reset not available' });
    engine.reset();
    res.json({ ok: true });
  });

  return router;
}
