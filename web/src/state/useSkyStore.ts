import { create } from 'zustand';

export interface SkyState {
  showConstellationLines: boolean;
  showConstellationNames: boolean;
  showDeepSkyObjects: boolean;
  toggleConstellationLines: () => void;
  toggleConstellationNames: () => void;
  toggleDeepSkyObjects: () => void;
  setConstellationLines: (val: boolean) => void;
  setConstellationNames: (val: boolean) => void;
  setDeepSkyObjects: (val: boolean) => void;
}

export const useSkyStore = create<SkyState>((set) => ({
  showConstellationLines: true,
  showConstellationNames: true,
  showDeepSkyObjects: true,
  toggleConstellationLines: () =>
    set((state) => ({ showConstellationLines: !state.showConstellationLines })),
  toggleConstellationNames: () =>
    set((state) => ({ showConstellationNames: !state.showConstellationNames })),
  toggleDeepSkyObjects: () =>
    set((state) => ({ showDeepSkyObjects: !state.showDeepSkyObjects })),
  setConstellationLines: (val: boolean) => set({ showConstellationLines: val }),
  setConstellationNames: (val: boolean) => set({ showConstellationNames: val }),
  setDeepSkyObjects: (val: boolean) => set({ showDeepSkyObjects: val }),
}));
