import { useRef, Suspense } from 'react';
import type { CameraControls } from '@react-three/drei';
import { SolarCanvas } from './components/SolarCanvas';
import { NavigationControls } from './components/NavigationControls';
import { SolarLighting } from './components/SolarLighting';
import { StarfieldCatalog } from './components/StarfieldCatalog';
import { SolarSystem } from './components/SolarSystem';
import { FactCard } from './components/ui/FactCard';
import { TimeScrubber } from './components/ui/TimeScrubber';
import { EclipseAlertBanner } from './components/ui/EclipseAlertBanner';
import { NeoRadarBanner } from './components/ui/NeoRadarBanner';
import { LocalSkyCard } from './components/ui/LocalSkyCard';
import { PlanetDock } from './components/ui/PlanetDock';
import { TourGuide } from './components/ui/TourGuide';
import { ShareModal } from './components/ui/ShareModal';
import { ZoomControls } from './components/ui/ZoomControls';
import { ControlsTutorial } from './components/ui/ControlsTutorial';
import { SpaceshipCockpitHUD } from './components/spaceship/SpaceshipCockpitHUD';

export default function App() {
  const cameraControlsRef = useRef<CameraControls>(null);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <SolarCanvas>
        <NavigationControls ref={cameraControlsRef} />
        <SolarLighting />

        <Suspense fallback={null}>
          {/* WWT-Style Star Catalog Celestial Dome */}
          <StarfieldCatalog />

          {/* Real-time Astronomical Solar System driven by NASA Ephemeris */}
          <SolarSystem controlsRef={cameraControlsRef} />
        </Suspense>
      </SolarCanvas>

      {/* NASA Eyes / Google Earth-Style Time Scrubbing Toolbar */}
      <TimeScrubber />

      {/* Real-time Astronomical Eclipse Predictor & Alert Banner */}
      <EclipseAlertBanner />

      {/* Live NASA NEO Asteroid Close-Approach Radar Banner */}
      <NeoRadarBanner />

      {/* "Tonight's Sky" Ground Observer Backyard HUD Card */}
      <LocalSkyCard />

      {/* Guided Solar System Tour */}
      <TourGuide />

      {/* 1-Click Planet Quick-Jump Dock */}
      <PlanetDock />

      {/* Google Earth / NASA Eyes-Style Planet Fact Sheet Card */}
      <FactCard />

      {/* Space Explorer Snapshot & Sharing Modal */}
      <ShareModal />

      {/* Spaceship Flight & Cockpit HUD */}
      <SpaceshipCockpitHUD />

      {/* Floating 1-Click Zoom In / Out & Overview Reset Controls */}
      <ZoomControls controlsRef={cameraControlsRef} />

      {/* Game-Style Cadet Flight Manual & Controls Tutorial */}
      <ControlsTutorial />
    </div>
  );
}
