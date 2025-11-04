
import create from 'zustand';

export type NodeDef = { id: string; type: string; };
export type LinkDef = { from: string; to: string; };

export type LayoutNode = NodeDef & { x: number; y: number };

export type ComponentState =
  | { type: 'Buffer', q: number, cap: number }
  | { type: 'Workstation', busy: number, m: number, inQ: number }
  | { type: 'Other' };

type UiState = {
  nodes: LayoutNode[];
  links: LinkDef[];
  selectedId: string | null;
  compState: Record<string, ComponentState>; // snapshot from backend
  setGraph: (nodes: NodeDef[], links: LinkDef[]) => void;
  updateNodePos: (id: string, x: number, y: number) => void;
  setSelected: (id: string | null) => void;
  applyStateSnapshot: (snap: Record<string, ComponentState>) => void;
  clear: () => void;
};

// lightweight layout: BFS ranks -> columns
function computeLayout(nodes: NodeDef[], links: LinkDef[], prev: LayoutNode[] | null): LayoutNode[] {
  // keep previous positions if already laid out
  if (prev && prev.length) {
    const map = new Map(prev.map(n => [n.id, n]));
    return nodes.map(n => {
      const p = map.get(n.id);
      return { id: n.id, type: n.type, x: p?.x ?? 24, y: p?.y ?? 24 };
    });
  }

  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map<string, number>();
  nodes.forEach(n => incoming.set(n.id, 0));
  links.forEach(l => incoming.set(l.to, (incoming.get(l.to) || 0) + 1));
  const sources = nodes.filter(n => (incoming.get(n.id) || 0) === 0).map(n => n.id);

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
  const maxRank = Math.max(0, ...Array.from(rank.values()));
  nodes.forEach(n => { if (!rank.has(n.id)) rank.set(n.id, maxRank + 1); });

  const cols: string[][] = [];
  for (const [id, r] of rank.entries()) {
    if (!cols[r]) cols[r] = [];
    cols[r].push(id);
  }
  const NODE_W = 160, NODE_H = 56, COL_GAP = 180, ROW_GAP = 28, PADDING = 32;
  const out: LayoutNode[] = [];
  cols.forEach((col, cIdx) => {
    col.forEach((id, rIdx) => {
      const x = PADDING + cIdx * (NODE_W + COL_GAP);
      const y = PADDING + rIdx * (NODE_H + ROW_GAP);
      const n = idToNode.get(id)!;
      out.push({ id, type: n.type, x, y });
    });
  });
  return out;
}

export const useModelStore = create<UiState>((set, get) => ({
  nodes: [],
  links: [],
  selectedId: null,
  compState: {},
  setGraph: (nodes, links) => {
    const laid = computeLayout(nodes, links, get().nodes);
    set({ nodes: laid, links });
  },
  updateNodePos: (id, x, y) => {
    set({ nodes: get().nodes.map(n => n.id === id ? { ...n, x, y } : n) });
  },
  setSelected: (id) => set({ selectedId: id }),
  applyStateSnapshot: (snap) => set({ compState: snap }),
  clear: () => set({ nodes: [], links: [], selectedId: null, compState: {} }),
}));
