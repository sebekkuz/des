
import React from 'react';
import { useModelStore } from '../store/useModelStore';

export default function Canvas2D() {
  const nodes = useModelStore(s => s.nodes);
  const links = useModelStore(s => s.links);

  const width = Math.max(600, ...nodes.map(n => n.x + 180));
  const height = Math.max(400, ...nodes.map(n => n.y + 80));

  return (
    <div style={{ flex: 1, margin: 8, background: '#f2f2f2', border: '1px solid #ddd' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* edges */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {links.map((l, idx) => {
          const a = nodes.find(n => n.id === l.from);
          const b = nodes.find(n => n.id === l.to);
          if (!a || !b) return null;
          const x1 = a.x + 140, y1 = a.y + 24;
          const x2 = b.x,       y2 = b.y + 24;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          return <path key={idx} d={d} fill="none" stroke="#888" strokeWidth="2" markerEnd="url(#arrow)" />;
        })}

        {/* nodes */}
        {nodes.map(n => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <rect width="140" height="48" rx="8" ry="8" fill="#fff" stroke="#999" />
            <text x="10" y="20" fontSize="12" fontWeight="600">{n.id}</text>
            <text x="10" y="36" fontSize="11" fill="#555">{n.type}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
