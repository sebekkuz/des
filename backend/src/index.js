// backend/src/index.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { parse as parseYaml } from "yaml";
import { Engine } from "./sim/engine.js";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.text({ type: ["text/*","application/yaml","application/x-yaml"], limit: "2mb" }));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let engine = new Engine(wss);

wss.on("connection", (ws) => {
  try { ws.send(JSON.stringify({ type: "HELLO", msg: "connected" })); } catch {}
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/load", async (req, res) => {
  try {
    let model = req.body;
    if (typeof model === "string") {
      try { model = JSON.parse(model); }
      catch { model = parseYaml(model); }
    }
    if (!model || typeof model !== "object") throw new Error("Model must be an object");

    try { engine.pause?.(); } catch {}
    try { engine.reset?.(); } catch {}

    if (typeof engine.load === "function") {
      await engine.load(model);
    } else if (typeof engine.loadModel === "function") {
      engine.loadModel(model);
    } else {
      throw new Error("Engine has no load/loadModel method");
    }

    broadcast({ type: "LOG", level: "info", msg: "Model loaded", at: Date.now() });
    res.json({ ok: true, msg: "Model loaded" });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[/api/load]", msg);
    res.status(422).json({ ok: false, error: msg });
  }
});

app.post("/api/start", (_, res) => { try { engine.start?.(); res.json({ ok: true }); } catch(e){ res.status(500).json({ ok:false, error:String(e?.message||e) }); } });
app.post("/api/pause", (_, res) => { try { engine.pause?.(); res.json({ ok: true }); } catch(e){ res.status(500).json({ ok:false, error:String(e?.message||e) }); } });
app.post("/api/reset", (_, res) => { try { engine.reset?.(); res.json({ ok: true }); } catch(e){ res.status(500).json({ ok:false, error:String(e?.message||e) }); } });

function broadcast(obj){
  const msg = JSON.stringify(obj);
  for (const c of wss.clients) {
    try { if (c.readyState === 1) c.send(msg); } catch {}
  }
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`✅ Backend listening on port ${PORT}`));
