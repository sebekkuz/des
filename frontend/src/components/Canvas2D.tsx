// frontend/src/components/Canvas2D.tsx
import React, { useEffect, useRef } from "react";
import { useModelStore } from "../lib/store";

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const components = useModelStore(s => s.components);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const rect = cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cvs.width = rect.width * dpr;
    cvs.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#f8f9fb";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const ids = Object.keys(components);
    ids.forEach((id, i) => {
      const x = 40 + i * 160;
      const y = 60;
      ctx.fillStyle = "#90caf9";
      ctx.strokeStyle = "#0d47a1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(x, y, 120, 60);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0d47a1";
      ctx.font = "12px monospace";
      ctx.fillText(`${id} (${components[id]?.type || "?"})`, x + 8, y + 18);
    });
  }, [components]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "420px" }} />;
}
