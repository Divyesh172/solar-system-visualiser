import { create } from 'zustand';
import { CURATED_FAMOUS_ASTEROIDS, type NearEarthAsteroid } from '../science/nasaNeoApi';

export interface AsteroidState {
  asteroids: NearEarthAsteroid[];
  showAsteroids: boolean;
  activeAlert: NearEarthAsteroid | null;
  selectedAsteroidId: string | null;
  isLoading: boolean;
  setAsteroids: (list: NearEarthAsteroid[]) => void;
  toggleShowAsteroids: () => void;
  setActiveAlert: (alert: NearEarthAsteroid | null) => void;
  selectAsteroid: (id: string | null) => void;
}

export const useAsteroidStore = create<AsteroidState>((set) => ({
  asteroids: CURATED_FAMOUS_ASTEROIDS,
  showAsteroids: true,
  activeAlert: null,
  selectedAsteroidId: null,
  isLoading: false,
  setAsteroids: (list) => set({ asteroids: list }),
  toggleShowAsteroids: () => set((state) => ({ showAsteroids: !state.showAsteroids })),
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  selectAsteroid: (id) => set({ selectedAsteroidId: id }),
}));
