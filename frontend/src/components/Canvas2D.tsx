
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useModelStore } from '../store/useModelStore';
import { nodeColor } from '../lib/graph';

type MoveToken = {
  id: number;
  from: string;
  to: string;
  tStart: number;
  tEnd: number;
  // snapshot of path control points at creation
  path: { x1:number,y1:number,mx:number,yc1:number,mx2:number,yc2:number,x2:number,y2:number };
  createdAtWall: number;
  durationMs: number;
};

function stateColor(type: string, state: any): string {
  const base = { idle:'#ffffff', busy:'#d1fae5', blocked:'#fde68a', starved:'#fca5a5', other:'#e5e7eb' };
  if (!state) return nodeColor(type) || base.other;
  if (type === 'Workstation') {
    if (state.busy > 0) return base.busy;
    if (state.inQ > 0) return base.blocked;
    return base.idle;
  }
  if (type === 'Buffer') {
    if (state.cap !== Infinity && state.q >= state.cap) return base.blocked;
    if (state.q === 0) return base.starved;
    return base.idle;
  }
  return nodeColor(type) || base.other;
}

export default function Canvas2D() {
  const nodes = useModelStore(s => s.nodes);
  const links = useModelStore(s => s.links);
  const compState = useModelStore(s => s.compState);
  const selectedId = useModelStore(s => s.selectedId);
  const updatePos = useModelStore(s => s.updateNodePos);
  const setSelected = useModelStore(s => s.setSelected);

  const width = Math.max(800, ...nodes.map(n => n.x + 220));
  const height = Math.max(400, ...nodes.map(n => n.y + 120));

  // animation tokens
  const [tokens, setTokens] = useState<MoveToken[]>([]);
  const animRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // helper to build a curved link path
  const buildPath = (fromId:string, toId:string) => {
    const a = nodes.find(n => n.id === fromId);
    const b = nodes.find(n => n.id === toId);
    if (!a || !b) return null;
    const x1 = a.x + 160, y1 = a.y + 28;
    const x2 = b.x,       y2 = b.y + 28;
    const mx = (x1 + x2) / 2;
    return { x1, y1, mx, yc1:y1, mx2:mx, yc2:y2, x2, y2 };
  };

  // Public handler from App via window event to add a token
  useEffect(() => {
    const onMove = (e: any) => {
      const { id, from, to, tStart, tEnd } = e.detail || {};
      const p = buildPath(from, to);
      if (!p) return;
      const SIM_MS_PER_SEC = 50; // engine tick: +1s sim per 50ms real
      const durationMs = Math.max(80, (tEnd - tStart) * SIM_MS_PER_SEC);
      setTokens(prev => [...prev, {
        id, from, to, tStart, tEnd, path: p, createdAtWall: performance.now(), durationMs
      }].slice(-300));
    };
    window.addEventListener('ENTITY_MOVE', onMove as any);
    return () => window.removeEventListener('ENTITY_MOVE', onMove as any);
  }, [nodes]);

  // drag
  const drag = useRef<{ id:string, dx:number, dy:number } | null>(null);
  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const svg = e.currentTarget.ownerSVGElement as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const node = nodes.find(n => n.id === id); if (!node) return;
    drag.current = { id, dx: loc.x - node.x, dy: loc.y - node.y };
    setSelected(id);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const { id, dx, dy } = drag.current;
    updatePos(id, Math.max(8, loc.x - dx), Math.max(8, loc.y - dy));
  };
  const onMouseUp = () => { drag.current = null; };

  // animation loop
  useEffect(() => {
    const step = () => {
      // cleanup finished tokens
      const now = performance.now();
      setTokens(prev => prev.filter(t => (now - t.createdAtWall) < t.durationMs + 30));
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // compute current position for token
  const posFor = (t: MoveToken) => {
    const p = (performance.now() - t.createdAtWall) / t.durationMs;
    const u = Math.min(1, Math.max(0, p));
    const { x1,y1,mx,yc1,x2,y2 } = t.path;
    // cubic-like ease with two mid control points
    const cx1 = mx, cy1 = yc1, cx2 = mx, cy2 = y2;
    const uu = 1-u, uu2 = uu*uu, u2 = u*u;
    const x = uu2* x1 + 2*uu*u* cx1 + u2* x2;
    const y = uu2* y1 + 2*uu*u* cy1 + u2* y2;
    return { x, y };
  };

  return (
    <div style={{ flex: 1, margin: 8, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}
           onMouseMove={onMouseMove as any} onMouseUp={onMouseUp as any}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        {/* links */}
        {links.map((l, idx) => {
          const a = nodes.find(n => n.id === l.from);
          const b = nodes.find(n => n.id === l.to);
          if (!a || !b) return null;
          const x1 = a.x + 160, y1 = a.y + 28;
          const x2 = b.x,       y2 = b.y + 28;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          return <path key={idx} d={d} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />;
        })}

        {/* nodes with counters */}
        {nodes.map(n => {
          const st = compState[n.id];
          const fill = stateColor(n.type, st);
          const isSel = n.id === selectedId;
          const stroke = isSel ? '#2563eb' : '#94a3b8';
          const strokeW = isSel ? 3 : 1.5;
          const isConv = n.type === 'Conveyor';
          const badge = () => {
            if (!st) return null;
            if (st.type === 'Buffer') return `q=${st.q}/${isFinite(st.cap)?st.cap:'∞'}`;
            if (st.type === 'Workstation') return `busy=${st.busy}/${st.m} inQ=${st.inQ}`;
            if (st.type === 'QualityCheck') return `ok=${st.ok||0} nok=${st.nok||0}`;
            if (st.type === 'Rework') return `done=${st.completed||0}`;
            if (st.type === 'Conveyor') return `L=${st.length||0} v=${st.speed||0}`;
            return null;
          };
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}
               onMouseDown={(e)=>onMouseDown(e, n.id)} style={{ cursor:'move' }}>
              {isConv ? (
                <rect x="0" y="10" width="160" height="36" rx="18" ry="18" fill={fill} stroke={stroke} strokeWidth={strokeW} />
              ) : (
                <rect width="160" height="56" rx="10" ry="10" fill={fill} stroke={stroke} strokeWidth={strokeW} />
              )}
              <text x="12" y="22" fontSize="12" fontWeight="600">{n.id}</text>
              <text x="12" y="38" fontSize="11" fill="#475569">{n.type}</text>
              <circle cx="0" cy="28" r="4" fill="#64748b" />
              <circle cx="160" cy="28" r="4" fill="#64748b" />
              {badge() && (
                <g>
                  <rect x="90" y="-8" rx="6" ry="6" width="70" height="18" fill="#111827" opacity="0.85" />
                  <text x="95" y="5" fontSize="10" fill="#f8fafc">{badge()}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* moving tokens */}
        {tokens.map(tok => {
          const p = posFor(tok);
          return <circle key={tok.id} cx={p.x} cy={p.y} r="5" fill="#111827" />;
        })}
      </svg>
    </div>
  );
}
