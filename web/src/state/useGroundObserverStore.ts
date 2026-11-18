import { create } from 'zustand';
import { type GeoLocation, PRESET_LOCATIONS } from '../science/topocentricCoordinates';

export type ObserverViewMode = 'space' | 'ground';

export interface GroundObserverState {
  viewMode: ObserverViewMode;
  location: GeoLocation;
  showCompassRing: boolean;
  showCardinalLabels: boolean;
  showPlanetMarkers: boolean;
  showAltAzGrid: boolean;
  isCompassExpanded: boolean;

  // Actions
  setViewMode: (mode: ObserverViewMode) => void;
  toggleViewMode: () => void;
  setLocation: (loc: GeoLocation) => void;
  setCustomLocation: (name: string, latitude: number, longitude: number, country?: string) => void;
  setShowCompassRing: (val: boolean) => void;
  setShowCardinalLabels: (val: boolean) => void;
  setShowPlanetMarkers: (val: boolean) => void;
  setShowAltAzGrid: (val: boolean) => void;
  setIsCompassExpanded: (val: boolean) => void;
}

export const useGroundObserverStore = create<GroundObserverState>((set) => ({
  viewMode: 'space',
  location: PRESET_LOCATIONS[0], // Default: New York City
  showCompassRing: true,
  showCardinalLabels: true,
  showPlanetMarkers: true,
  showAltAzGrid: false,
  isCompassExpanded: false,

  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () =>
    set((state) => ({ viewMode: state.viewMode === 'space' ? 'ground' : 'space' })),
  setLocation: (location) => set({ location }),
  setCustomLocation: (name, latitude, longitude, country = 'Custom') =>
    set({
      location: {
        id: 'custom',
        name,
        region: 'User Defined',
        country,
        flagEmoji: '📍',
        latitude,
        longitude,
        description: `Custom observer location (${latitude >= 0 ? `${latitude.toFixed(2)}°N` : `${Math.abs(latitude).toFixed(2)}°S`}, ${longitude >= 0 ? `${longitude.toFixed(2)}°E` : `${Math.abs(longitude).toFixed(2)}°W`})`,
      },
    }),
  setShowCompassRing: (showCompassRing) => set({ showCompassRing }),
  setShowCardinalLabels: (showCardinalLabels) => set({ showCardinalLabels }),
  setShowPlanetMarkers: (showPlanetMarkers) => set({ showPlanetMarkers }),
  setShowAltAzGrid: (showAltAzGrid) => set({ showAltAzGrid }),
  setIsCompassExpanded: (isCompassExpanded) => set({ isCompassExpanded }),
}));
