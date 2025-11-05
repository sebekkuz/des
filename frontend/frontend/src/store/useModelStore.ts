// frontend/src/store/useModelStore.ts
import create from 'zustand';

type CompState = {
  type: string;
  q?: number; cap?: number;
  busy?: number; m?: number; inQ?: number; down?: boolean;
  ok?: number; nok?: number;
  length?: number; speed?: number;
};

type NodeInfo = {
  id: string;
  x: number;
  y: number;
};

type Store = {
  components: Record<string, CompState>;
  nodes: Record<string, NodeInfo>;
  applyStateSnapshot: (snap: Record<string, CompState>) => void;
  setNodePos: (id: string, x: number, y: number) => void;
};

function autoPos(index: number): {x:number,y:number} {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 60 + col * 200, y: 60 + row * 140 };
}

export const useModelStore = create<Store>((set, get) => ({
  components: {},
  nodes: {},
  applyStateSnapshot: (snap) => {
    const now = { ...get().components, ...snap };
    const nodes = { ...get().nodes };
    const ids = Object.keys(snap);
    ids.forEach(() => {
      const idx = Object.keys(nodes).length;
      const id = ids.find(k => nodes[k] === undefined)!;
      if (id && !nodes[id]) nodes[id] = { id, ...autoPos(idx) };
    });
    set({ components: now, nodes });
  },
  setNodePos: (id, x, y) => {
    const nodes = { ...get().nodes };
    nodes[id] = { id, x, y };
    set({ nodes });
  }
}));
