// frontend/src/lib/store.ts
import { create } from "zustand";

export const useModelStore = create((set) => ({
  components: {},
  state: {},
  setComponents: (components) => set({ components }),
  setState: (state) => set({ state }),
}));
