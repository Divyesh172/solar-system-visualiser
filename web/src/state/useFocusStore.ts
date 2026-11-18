import { create } from 'zustand';

export interface TargetMetadata {
  id: string;
  name: string;
  radius: number;
  type: 'star' | 'planet' | 'moon' | 'satellite' | 'comet' | 'asteroid';
}

interface FocusState {
  selectedId: string | null;
  hoveredId: string | null;
  activeTarget: TargetMetadata | null;

  // Actions
  selectBody: (target: TargetMetadata | null) => void;
  hoverBody: (id: string | null) => void;
  clearSelection: () => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  selectedId: null,
  hoveredId: null,
  activeTarget: null,

  selectBody: (target) =>
    set({
      selectedId: target ? target.id : null,
      activeTarget: target,
    }),

  hoverBody: (id) => set({ hoveredId: id }),

  clearSelection: () =>
    set({
      selectedId: null,
      activeTarget: null,
    }),
}));
