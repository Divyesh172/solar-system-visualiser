import { create } from 'zustand';
import { dateToJde, J2000_JDE, type TimeSpeedPreset, TIME_SPEED_RATES } from './time';

interface SimulationClockState {
  currentJde: number;
  isPaused: boolean;
  direction: number; // 1.0 for forward, -1.0 for reverse
  activePreset: TimeSpeedPreset;
  speedDaysPerSec: number;

  // Actions
  advanceTime: (deltaSeconds: number) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  reverseDirection: () => void;
  setSpeedPreset: (preset: TimeSpeedPreset) => void;
  jumpToJde: (jde: number) => void;
  resetToToday: () => void;
  resetToJ2000: () => void;
}

export const useSimulationClock = create<SimulationClockState>((set, get) => ({
  // Initialize to the exact astronomical Julian date of right now!
  currentJde: dateToJde(new Date()),
  isPaused: false,
  direction: 1.0,
  activePreset: 'day_per_sec',
  speedDaysPerSec: TIME_SPEED_RATES.day_per_sec,

  advanceTime: (deltaSeconds: number) => {
    const { isPaused, direction, speedDaysPerSec, currentJde } = get();
    if (!isPaused) {
      const deltaDays = deltaSeconds * speedDaysPerSec * direction;
      set({ currentJde: currentJde + deltaDays });
    }
  },

  togglePause: () => set((state: SimulationClockState) => ({ isPaused: !state.isPaused })),
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  reverseDirection: () => set((state: SimulationClockState) => ({ direction: -state.direction })),

  setSpeedPreset: (preset: TimeSpeedPreset) =>
    set({
      activePreset: preset,
      speedDaysPerSec: TIME_SPEED_RATES[preset],
    }),

  jumpToJde: (jde: number) => set({ currentJde: jde }),
  resetToToday: () => set({ currentJde: dateToJde(new Date()) }),
  resetToJ2000: () => set({ currentJde: J2000_JDE }),
}));
