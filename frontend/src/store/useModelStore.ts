import create from 'zustand';

// Define a minimal state for the model.  This can be expanded to include
// lists of components, connections, simulation status and metrics.

interface ModelState {
  model: any;
  setModel: (model: any) => void;
}

const useModelStore = create<ModelState>((set) => ({
  model: null,
  setModel: (model: any) => set({ model }),
}));

export default useModelStore;