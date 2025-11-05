// backend/src/index.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Engine } from "./sim/engine.js";

const app = express();

// === ✅ CORS FIX ===
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

let engine = new Engine(wss);

wss.on("connection", (ws) => {
  console.log("[WS] connected");
  ws.send(JSON.stringify({ type: "HELLO", msg: "connected" }));
});

// === API ===
app.post("/api/load", async (req, res) => {
  try {
    const model = req.body;
    await engine.load(model);
    res.json({ ok: true, msg: "Model loaded" });
  } catch (err) {
    console.error("Load error:", err);
    res.status(422).json({ ok: false, msg: err.message });
  }
});

app.post("/api/start", (_, res) => {
  engine.start();
  res.json({ ok: true });
});

app.post("/api/pause", (_, res) => {
  engine.pause?.();
  res.json({ ok: true });
});

app.post("/api/reset", (_, res) => {
  engine.reset?.();
  res.json({ ok: true });
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`✅ Backend listening on port ${PORT}`));
