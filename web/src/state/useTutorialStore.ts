import { create } from 'zustand';

interface TutorialState {
  isOpen: boolean;
  activeSlide: number;
  openTutorial: (slideIndex?: number) => void;
  closeTutorial: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setSlide: (index: number) => void;
}

export const TOTAL_SLIDES = 5;

export const useTutorialStore = create<TutorialState>((set) => ({
  // Check if first-time visitor (default to false if already seen)
  isOpen: typeof window !== 'undefined' ? !localStorage.getItem('kidstar_tutorial_seen_v1') : false,
  activeSlide: 0,

  openTutorial: (slideIndex = 0) => set({ isOpen: true, activeSlide: slideIndex }),

  closeTutorial: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kidstar_tutorial_seen_v1', 'true');
    }
    set({ isOpen: false });
  },

  nextSlide: () =>
    set((state) => ({
      activeSlide: Math.min(state.activeSlide + 1, TOTAL_SLIDES - 1),
    })),

  prevSlide: () =>
    set((state) => ({
      activeSlide: Math.max(state.activeSlide - 1, 0),
    })),

  setSlide: (index) => set({ activeSlide: index }),
}));
