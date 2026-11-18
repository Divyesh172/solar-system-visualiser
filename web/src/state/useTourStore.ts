import { create } from 'zustand';

interface TourState {
  isOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  isOpen: false,
  startTour: () => set({ isOpen: true }),
  closeTour: () => set({ isOpen: false }),
}));
