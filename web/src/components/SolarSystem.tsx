import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationClock } from '../science/useSimulationClock';
import { getPlanetHeliocentricPosition, type PlanetKey } from '../science/ephemeris';
import { CoordinateProjector } from '../science/transforms';
import { Orbits } from './Orbits';
import { SolarCorona } from './SolarCorona';
import { Earth } from './planets/Earth';
import { TerrestrialPlanet } from './planets/TerrestrialPlanet';
import { GasGiant } from './planets/GasGiant';
import { SelectionReticle } from './interaction/SelectionReticle';
import { CameraController } from './interaction/CameraController';
import { PlanetLabel } from './interaction/PlanetLabels';
import { SpaceshipVessel } from './spaceship/SpaceshipVessel';
import { WarpStreaks } from './spaceship/WarpStreaks';
import { CometSystem } from './comets/CometSystem';
import { GroundSkyDome } from './ground/GroundSkyDome';
import { GroundCameraController } from './ground/GroundCameraController';
import { useGroundObserverStore } from '../state/useGroundObserverStore';
import type { CameraControls } from '@react-three/drei';
import type { MoonConfig } from './moons/MoonOrbitSystem';

interface SolarSystemProps {
  controlsRef: React.RefObject<CameraControls | null>;
}

const JUPITER_MOONS: MoonConfig[] = [
  { id: 'io',       name: 'Io',       texturePath: '/textures/moon_io.png',       radius: 0.38, distance: 5.8,  periodDays: 1.769,  color: '#e6cc80' },
  { id: 'europa',   name: 'Europa',   texturePath: '/textures/moon_europa.png',   radius: 0.34, distance: 8.0,  periodDays: 3.551,  color: '#a0c4e8' },
  { id: 'ganymede', name: 'Ganymede', texturePath: '/textures/moon_ganymede.png', radius: 0.58, distance: 11.5, periodDays: 7.155,  color: '#b8b09d' },
  { id: 'callisto', name: 'Callisto', texturePath: '/textures/moon_callisto.png', radius: 0.54, distance: 16.0, periodDays: 16.689, color: '#8a8a99' },
];

const SATURN_MOONS: MoonConfig[] = [
  {
    id: 'titan',
    name: 'Titan',
    texturePath: '/textures/moon_titan.png',
    radius: 0.56,
    distance: 12.5,
    periodDays: 15.945,
    color: '#e08a38',
    hasAtmosphere: true,
    atmosphereColor: '#f59e0b',
  },
];

const NEPTUNE_MOONS: MoonConfig[] = [
  {
    id: 'triton',
    name: 'Triton',
    texturePath: '/textures/moon_triton.png',
    bumpMapPath: '/textures/moon_triton_bump.png',
    bumpScale: 0.038,
    radius: 0.36,
    distance: 8.5,
    periodDays: 5.877,
    color: '#a0d0e0',
    inclinationDeg: 156.8, // Famous retrograde inclination!
    roughness: 0.52, // Frozen nitrogen and methane ice gloss
    metalness: 0.03,
    hasAtmosphere: true,
    atmosphereColor: '#bae6fd', // Tenuous pale-cyan nitrogen ice atmospheric rim
    atmosphereScale: 1.025,
    atmosphereOpacity: 0.22,
  },
];

export const SolarSystem: FC<SolarSystemProps> = ({ controlsRef }) => {
  const advanceTime = useSimulationClock((state) => state.advanceTime);
  const isGroundMode = useGroundObserverStore((state) => state.viewMode === 'ground');

  const projector = useMemo(() => new CoordinateProjector({ auToWorld: 42.0 }), []);

  const rootGroupRef = useRef<THREE.Group>(null);

  // Individual planet group references for 60 FPS transform updating
  const planetRefs = {
    mercury: useRef<THREE.Group>(null),
    venus: useRef<THREE.Group>(null),
    earth: useRef<THREE.Group>(null),
    mars: useRef<THREE.Group>(null),
    jupiter: useRef<THREE.Group>(null),
    saturn: useRef<THREE.Group>(null),
    uranus: useRef<THREE.Group>(null),
    neptune: useRef<THREE.Group>(null),
  };

  // Update positions every frame according to current astronomical Julian date
  useFrame((_, delta) => {
    // 1. Advance simulation clock
    advanceTime(delta);
    const currentJde = useSimulationClock.getState().currentJde;

    // 2. Propagate all 8 planets along their real orbits
    const planets: (keyof typeof planetRefs)[] = [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ];

    for (const p of planets) {
      const ref = planetRefs[p];
      if (ref.current) {
        const astroPos = getPlanetHeliocentricPosition(p as PlanetKey, currentJde);
        const [x, y, z] = projector.projectPosition(astroPos);
        ref.current.position.set(x, y, z);
      }
    }
  });

  const getTargetPosition = (id: string): THREE.Vector3 | null => {
    if (id === 'sun') return new THREE.Vector3(0, 0, 0);
    const ref = planetRefs[id as keyof typeof planetRefs];
    if (ref?.current) {
      const pos = new THREE.Vector3();
      ref.current.getWorldPosition(pos);
      return pos;
    }
    // Check if it's a child in the solar system (moon, satellite, or comet)
    if (rootGroupRef.current) {
      const targetLower = id.toLowerCase();
      let foundPos: THREE.Vector3 | null = null;
      rootGroupRef.current.traverse((child) => {
        if (!foundPos && child.name && child.name.toLowerCase() === targetLower) {
          foundPos = new THREE.Vector3();
          child.getWorldPosition(foundPos);
        }
      });
      if (foundPos) return foundPos;
    }
    return null;
  };

  return (
    <group ref={rootGroupRef} name="SolarSystemRoot">
      {/* 0. Backyard Ground Horizon & Sky Dome ("Stand on Earth" Mode) */}
      <GroundSkyDome />
      <GroundCameraController controlsRef={controlsRef} />

      <group visible={!isGroundMode}>
        {/* 1. Precomputed static 180-segment orbit tracks */}
      <Orbits projector={projector} />

      {/* Real Keplerian High-Eccentricity Comets (Halley, NEOWISE, Hale-Bopp, Encke) */}
      <CometSystem projector={projector} />

      {/* 2. Photorealistic Central Sun & Radiant Coronal Flare */}
      <SolarCorona sunRadius={4.2} />
      <PlanetLabel id="sun" name="Sun" radius={4.2} />

      {/* 3. Interactive Selection Tracking Reticle */}
      <SelectionReticle getTargetPosition={getTargetPosition} />

      {/* 4. Cinematic Fly-To Camera Controller & Orbit Tracking */}
      <CameraController controlsRef={controlsRef} getTargetPosition={getTargetPosition} />

      {/* 5. Interplanetary Spaceship & Hyperspace Warp Streaks */}
      <SpaceshipVessel />
      <WarpStreaks />

      {/* 3. Real Ephemeris Planet Nodes */}
      {/* Mercury */}
      <group ref={planetRefs.mercury}>
        <PlanetLabel id="mercury" name="Mercury" radius={0.85} />
        <TerrestrialPlanet
          id="mercury"
          name="Mercury"
          texturePath="/textures/mercury.png"
          bumpMapPath="/textures/mercury_bump.png"
          bumpScale={0.045}
          radius={0.85}
          axialTiltDeg={0.034}
          rotationPeriodHours={1407.6}
          hasAtmosphere={false}
          roughness={0.92}
        />
      </group>

      {/* Venus */}
      <group ref={planetRefs.venus}>
        <PlanetLabel id="venus" name="Venus" radius={2.1} />
        <TerrestrialPlanet
          id="venus"
          name="Venus"
          texturePath="/textures/venus.png"
          radius={2.1}
          axialTiltDeg={177.36}
          rotationPeriodHours={-5832.5}
          hasAtmosphere={false}
          roughness={0.88}
          metalness={0.0}
        />
      </group>

      {/* Earth */}
      <group ref={planetRefs.earth}>
        <PlanetLabel id="earth" name="Earth" radius={2.2} />
        <Earth radius={2.2} />
      </group>

      {/* Mars */}
      <group ref={planetRefs.mars}>
        <PlanetLabel id="mars" name="Mars" radius={1.18} />
        <TerrestrialPlanet
          id="mars"
          name="Mars"
          texturePath="/textures/mars.png"
          bumpMapPath="/textures/mars_bump.png"
          bumpScale={0.035}
          radius={1.18}
          axialTiltDeg={25.19}
          rotationPeriodHours={24.6}
          hasAtmosphere={false}
          roughness={0.9}
          metalness={0.02}
        />
      </group>

      {/* Jupiter */}
      <group ref={planetRefs.jupiter}>
        <PlanetLabel id="jupiter" name="Jupiter" radius={3.8} />
        <GasGiant
          id="jupiter"
          name="Jupiter"
          texturePath="/textures/jupiter.png"
          radius={3.8}
          axialTiltDeg={3.13}
          rotationPeriodHours={9.93}
          moons={JUPITER_MOONS}
          roughness={0.88}
          metalness={0.0}
        />
      </group>

      {/* Saturn */}
      <group ref={planetRefs.saturn}>
        <PlanetLabel id="saturn" name="Saturn" radius={3.2} />
        <GasGiant
          id="saturn"
          name="Saturn"
          texturePath="/textures/saturn.png"
          radius={3.2}
          axialTiltDeg={26.73}
          rotationPeriodHours={10.7}
          hasRings={true}
          moons={SATURN_MOONS}
          roughness={0.88}
          metalness={0.0}
        />
      </group>

      {/* Uranus */}
      <group ref={planetRefs.uranus}>
        <PlanetLabel id="uranus" name="Uranus" radius={2.4} />
        <GasGiant
          id="uranus"
          name="Uranus"
          texturePath="/textures/uranus.png"
          radius={2.4}
          axialTiltDeg={97.77}
          rotationPeriodHours={-17.2}
          hasRings={true}
          ringTexturePath="/textures/uranus_ring.png"
          ringInnerRatio={1.35}
          ringOuterRatio={2.05}
          ringOpacity={0.40}
          roughness={0.88}
          metalness={0.0}
        />
      </group>

      {/* Neptune */}
      <group ref={planetRefs.neptune}>
        <PlanetLabel id="neptune" name="Neptune" radius={2.3} />
        <GasGiant
          id="neptune"
          name="Neptune"
          texturePath="/textures/neptune.png"
          radius={2.3}
          axialTiltDeg={28.32}
          rotationPeriodHours={16.1}
          hasRings={true}
          ringTexturePath="/textures/neptune_ring.png"
          ringInnerRatio={1.55}
          ringOuterRatio={2.65}
          ringOpacity={0.20}
          roughness={0.85}
          metalness={0.0}
          moons={NEPTUNE_MOONS}
        />
      </group>
      </group>
    </group>
  );
};
