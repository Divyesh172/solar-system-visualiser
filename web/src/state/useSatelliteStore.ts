import { create } from 'zustand';

interface SatelliteState {
  showSatellites: boolean;
  toggleSatellites: () => void;
  setShowSatellites: (show: boolean) => void;
}

export const useSatelliteStore = create<SatelliteState>((set) => ({
  showSatellites: true,
  toggleSatellites: () => set((state) => ({ showSatellites: !state.showSatellites })),
  setShowSatellites: (show) => set({ showSatellites: show }),
}));
