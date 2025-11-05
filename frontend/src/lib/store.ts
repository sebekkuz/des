// frontend/src/lib/store.ts
import { create } from "zustand";

type State = {
  components: Record<string, any>;
  sim: any;
  setComponents: (c: Record<string, any>) => void;
  setSim: (s: any) => void;
};

export const useModelStore = create<State>((set) => ({
  components: {},
  sim: { running: false, t: 0 },
  setComponents: (components) => set({ components }),
  setSim: (sim) => set({ sim }),
}));
