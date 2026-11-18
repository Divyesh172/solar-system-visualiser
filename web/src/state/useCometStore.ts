import { create } from 'zustand';
import type { CometId } from '../science/cometCatalog';

export interface CometState {
  showComets: boolean;
  selectedCometId: CometId | null;
  toggleComets: () => void;
  setShowComets: (val: boolean) => void;
  selectComet: (id: CometId | null) => void;
}

export const useCometStore = create<CometState>((set) => ({
  showComets: true,
  selectedCometId: null,
  toggleComets: () => set((state) => ({ showComets: !state.showComets })),
  setShowComets: (val) => set({ showComets: val }),
  selectComet: (id) => set({ selectedCometId: id }),
}));
