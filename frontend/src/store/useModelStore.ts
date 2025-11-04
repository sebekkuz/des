
import create from 'zustand';

export type NodeDef = { id: string; type: string; };
export type LinkDef = { from: string; to: string; };

export type LayoutNode = NodeDef & { x: number; y: number };

type ModelState = {
  nodes: LayoutNode[];
  links: LinkDef[];
  setGraph: (nodes: NodeDef[], links: LinkDef[]) => void;
  clear: () => void;
};

// very small, dependency-free layout: rank by BFS depth, vertical spacing inside column
function computeLayout(nodes: NodeDef[], links: LinkDef[]): LayoutNode[] {
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map<string, number>();
  nodes.forEach(n => incoming.set(n.id, 0));
  links.forEach(l => incoming.set(l.to, (incoming.get(l.to) || 0) + 1));
  const sources = nodes.filter(n => (incoming.get(n.id) || 0) === 0).map(n => n.id);

  // BFS to assign ranks
  const rank = new Map<string, number>();
  const adj = new Map<string, string[]>();
  links.forEach(l => {
    if (!adj.has(l.from)) adj.set(l.from, []);
    adj.get(l.from)!.push(l.to);
  });
  const q: string[] = [...sources];
  sources.forEach(id => rank.set(id, 0));
  while (q.length) {
    const id = q.shift()!;
    const r = rank.get(id) || 0;
    for (const nxt of (adj.get(id) || [])) {
      if (!rank.has(nxt)) {
        rank.set(nxt, r + 1);
        q.push(nxt);
      }
    }
  }
  // nodes not reached: put at last column
  const maxRank = Math.max(0, ...Array.from(rank.values()));
  nodes.forEach(n => { if (!rank.has(n.id)) rank.set(n.id, maxRank + 1); });

  // group by rank, assign positions
  const cols: string[][] = [];
  for (const [id, r] of rank.entries()) {
    if (!cols[r]) cols[r] = [];
    cols[r].push(id);
  }
  const NODE_W = 140, NODE_H = 48, COL_GAP = 160, ROW_GAP = 24, PADDING = 24;
  const out: LayoutNode[] = [];
  cols.forEach((col, cIdx) => {
    col.forEach((id, rIdx) => {
      const baseY = PADDING + rIdx * (NODE_H + ROW_GAP);
      const x = PADDING + cIdx * (NODE_W + COL_GAP);
      const y = baseY;
      const n = idToNode.get(id)!;
      out.push({ id, type: n.type, x, y });
    });
  });
  return out;
}

export const useModelStore = create<ModelState>((set, get) => ({
  nodes: [],
  links: [],
  setGraph: (nodes, links) => {
    const laid = computeLayout(nodes, links);
    set({ nodes: laid, links });
  },
  clear: () => set({ nodes: [], links: [] }),
}));
