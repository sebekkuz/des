// frontend/src/components/Canvas2D.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useModelStore } from '../store/useModelStore';

type Box = { id: string; x: number; y: number; w: number; h: number; type: string; fill: string; text: string; };

function colorFor(comp: any): string {
  if (!comp) return '#ddd';
  if (comp.type === 'Workstation') {
    if (comp.down) return '#ffaaaa';
    if ((comp.busy || 0) >= (comp.m || 1)) return '#aaffaa';
    if ((comp.inQ || 0) > 0) return '#ffffaa';
    return '#ddeeff';
  }
  if (comp.type === 'Buffer') {
    if ((comp.q || 0) >= (comp.cap ?? Infinity)) return '#ffccaa';
    return '#eee';
  }
  if (comp.type === 'QualityCheck') return '#e6d4ff';
  if (comp.type === 'EntitySink') return '#cccccc';
  return '#f2f2f2';
}

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const components = useModelStore(s => s.components);
  const nodes = useModelStore(s => s.nodes);
  const setNodePos = useModelStore(s => s.setNodePos);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = cvs.getBoundingClientRect();
    cvs.width = rect.width * dpr;
    cvs.height = (rect.height) * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#f8f9fb';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const boxes: Box[] = [];
    Object.entries(nodes).forEach(([id, p]) => {
      const comp = (components as any)[id];
      const w = 140, h = 60;
      const fill = colorFor(comp);
      let text = `${id} (${comp?.type || '?'})`;
      if (comp?.type === 'Workstation') text += `\nQ:${comp.inQ ?? 0} B:${comp.busy ?? 0}/${comp.m ?? 1}`;
      if (comp?.type === 'Buffer') text += `\n${comp.q ?? 0}/${comp.cap ?? '∞'}`;
      boxes.push({ id, x: (p as any).x, y: (p as any).y, w, h, type: comp?.type || '?', fill, text });
    });

    // Simple left->right links by x order
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    const ids = Object.keys(nodes).sort((a,b)=>(nodes as any)[a].x - (nodes as any)[b].x);
    for (let i=0;i<ids.length-1;i++) {
      const a = (nodes as any)[ids[i]], b = (nodes as any)[ids[i+1]];
      ctx.beginPath();
      ctx.moveTo(a.x + 140, a.y + 30);
      ctx.lineTo(b.x, b.y + 30);
      ctx.stroke();
    }

    boxes.forEach(b => {
      ctx.fillStyle = b.fill;
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.font = '12px ui-monospace, monospace';
      const lines = b.text.split('\n');
      lines.forEach((ln, i) => ctx.fillText(ln, b.x + 8, b.y + 18 + i*14));
    });
  }, [components, nodes]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const getHit = (x: number, y: number) => {
      const entries = Object.entries(nodes);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [id, p] = entries[i] as any;
        if (x >= p.x && x <= p.x + 140 && y >= p.y && y <= p.y + 60) return id;
      }
      return null;
    };

    const onDown = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = getHit(x, y);
      if (id) setDrag({ id, dx: x - (nodes as any)[id].x, dy: y - (nodes as any)[id].y });
    };
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setNodePos(drag.id, Math.max(10, x - drag.dx), Math.max(10, y - drag.dy));
    };
    const onUp = () => setDrag(null);

    cvs.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      cvs.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, nodes, setNodePos]);

  return (
    <div style={{ flex: 1, background: '#f8f9fb', borderRight: '1px solid #eee' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 360 }} />
    </div>
  );
}
