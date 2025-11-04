
import React, { useMemo, useRef, useState } from 'react';
import { useModelStore } from '../store/useModelStore';

function colorFor(type: string, state: any): string {
  // default palette
  const base = {
    idle: '#ffffff',
    busy: '#d1fae5',
    blocked: '#fde68a',
    starved: '#fca5a5',
    other: '#e5e7eb'
  };
  if (!state) return base.other;

  if (state.type === 'Workstation') {
    if (state.busy > 0) return base.busy;
    if (state.inQ > 0) return base.blocked; // czekają, ale brak slotu
    return base.idle;
  }
  if (state.type === 'Buffer') {
    if (state.cap !== Infinity && state.q >= state.cap) return base.blocked; // full
    if (state.q === 0) return base.starved;
    return base.idle;
  }
  return base.other;
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

  // drag state
  const drag = useRef<{ id:string, dx:number, dy:number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const svg = e.currentTarget.ownerSVGElement as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    drag.current = { id, dx: loc.x - node.x, dy: loc.y - node.y };
    setSelected(id);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const { id, dx, dy } = drag.current;
    updatePos(id, Math.max(8, loc.x - dx), Math.max(8, loc.y - dy));
  };
  const onMouseUp = () => { drag.current = null; };

  return (
    <div style={{ flex: 1, margin: 8, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}
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

        {/* nodes with ports */}
        {nodes.map(n => {
          const st = compState[n.id];
          const fill = colorFor(n.type, st);
          const isSel = n.id === selectedId;
          const stroke = isSel ? '#2563eb' : '#94a3b8';
          const strokeW = isSel ? 3 : 1.5;

          // Conveyor look: pill shape
          const isConv = n.type === 'Conveyor';
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}
               onMouseDown={(e)=>onMouseDown(e, n.id)} style={{ cursor:'move' }}>
              {isConv ? (
                <g>
                  <rect x="0" y="10" width="160" height="36" rx="18" ry="18" fill={fill} stroke={stroke} strokeWidth={strokeW} />
                </g>
              ) : (
                <rect width="160" height="56" rx="10" ry="10" fill={fill} stroke={stroke} strokeWidth={strokeW} />
              )}
              {/* title */}
              <text x="12" y="22" fontSize="12" fontWeight="600">{n.id}</text>
              <text x="12" y="38" fontSize="11" fill="#475569">{n.type}</text>

              {/* ports */}
              <circle cx="0" cy="28" r="4" fill="#64748b" />
              <circle cx="160" cy="28" r="4" fill="#64748b" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
