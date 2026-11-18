import { create } from 'zustand';
import { spaceshipAudio } from '../utils/spaceshipAudio';

interface SpaceshipState {
  isFlying: boolean;
  destinationName: string;
  destinationColor: string;
  progress: number;
  arrivalNotice: string | null;

  startFlight: (destinationName: string, destinationColor: string) => void;
  updateProgress: (progress: number) => void;
  endFlight: () => void;
}

export const useSpaceshipStore = create<SpaceshipState>((set) => ({
  isFlying: false,
  destinationName: '',
  destinationColor: '#38bdf8',
  progress: 0,
  arrivalNotice: null,

  startFlight: (destinationName, destinationColor) => {
    spaceshipAudio.playWarpEngage();
    set({
      isFlying: true,
      destinationName,
      destinationColor,
      progress: 0,
      arrivalNotice: null,
    });
  },

  updateProgress: (progress) => set({ progress }),

  endFlight: () => {
    spaceshipAudio.playArrivalChime();
    set((state) => ({
      isFlying: false,
      arrivalNotice: `Orbit insertion complete at ${state.destinationName}!`,
      progress: 1,
    }));

    setTimeout(() => {
      set({ arrivalNotice: null });
    }, 3200);
  },
}));
