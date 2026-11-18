import { useMemo, useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { getJupiterMoons, type JupiterMoonsEphemeris } from '../../science/astroEngineAdapter';
import { MoonLabel } from '../interaction/MoonLabel';

export interface MoonConfig {
  id: string;
  name: string;
  texturePath: string;
  bumpMapPath?: string;
  bumpScale?: number;
  radius: number;
  distance: number;
  periodDays: number;
  color: string;
  inclinationDeg?: number;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereScale?: number;
  atmosphereOpacity?: number;
  roughness?: number;
  metalness?: number;
}

interface MoonInstanceProps {
  config: MoonConfig;
}

const MoonSphereBasic: FC<{ config: MoonConfig; texture: THREE.Texture }> = ({ config, texture }) => (
  <mesh castShadow receiveShadow name={config.name}>
    <sphereGeometry args={[config.radius, 64, 48]} />
    <meshStandardMaterial
      map={texture}
      roughness={config.roughness ?? 0.86}
      metalness={config.metalness ?? 0.02}
    />
  </mesh>
);

const MoonSphereWithBump: FC<{ config: MoonConfig & { bumpMapPath: string }; texture: THREE.Texture }> = ({ config, texture }) => {
  const bumpMap = useLoader(THREE.TextureLoader, config.bumpMapPath);
  return (
    <mesh castShadow receiveShadow name={config.name}>
      <sphereGeometry args={[config.radius, 64, 48]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={bumpMap}
        bumpScale={config.bumpScale ?? 0.035}
        roughness={config.roughness ?? 0.86}
        metalness={config.metalness ?? 0.02}
      />
    </mesh>
  );
};

const MoonInstance: FC<MoonInstanceProps> = ({ config }) => {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const lastJdeRef = useRef<number>(-1);

  const isGalilean =
    config.id === 'io' ||
    config.id === 'europa' ||
    config.id === 'ganymede' ||
    config.id === 'callisto';

  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);

  const texture = useLoader(THREE.TextureLoader, config.texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Precomputed orbit line loop
  const orbitGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * config.distance, 0, Math.sin(theta) * config.distance));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [config.distance]);

  useFrame((_, delta) => {
    const { currentJde, isPaused, speedDaysPerSec, direction } = useSimulationClock.getState();

    if (isGalilean) {
      // 1. High-Precision Physical Ephemeris for Jupiter's Galilean Moons
      if (!isPaused || lastJdeRef.current !== currentJde) {
        lastJdeRef.current = currentJde;
        const jupMoons = getJupiterMoons(currentJde);
        const moonData = jupMoons[config.id as keyof JupiterMoonsEphemeris];
        if (groupRef.current && moonData) {
          const [dirX, dirY, dirZ] = moonData.direction;
          groupRef.current.position.set(
            dirX * config.distance,
            dirY * config.distance,
            dirZ * config.distance
          );
          // Authentic Tidal Locking: Same face points directly toward Jupiter at (0, 0, 0)
          groupRef.current.lookAt(0, 0, 0);
        }
      }
    } else {
      // 2. Keplerian Orbital Propagation for other planetary moons (Titan, Triton)
      if (isPaused && lastJdeRef.current === currentJde) return;
      lastJdeRef.current = currentJde;

      if (!isPaused) {
        const days = delta * speedDaysPerSec * direction;
        const revs = days / config.periodDays;
        angleRef.current += revs * Math.PI * 2;
      }

      const angle = angleRef.current;
      if (groupRef.current) {
        groupRef.current.position.set(
          Math.cos(angle) * config.distance,
          0,
          Math.sin(angle) * config.distance
        );
        // Tidal locking
        groupRef.current.lookAt(0, 0, 0);
      }
    }
  });

  const tiltRad = ((config.inclinationDeg ?? 0) * Math.PI) / 180.0;

  return (
    <group rotation={[tiltRad, 0, 0]}>
      {/* 1. Orbit guide line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial color={config.color} transparent opacity={0.3} depthWrite={false} />
      </lineLoop>

      {/* 2. Moon Body */}
      <group
        ref={groupRef}
        name={config.id}
        onClick={(e) => {
          e.stopPropagation();
          selectBody({ id: config.id, name: config.name, radius: config.radius, type: 'moon' });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverBody(config.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          hoverBody(null);
        }}
      >
        {config.bumpMapPath ? (
          <MoonSphereWithBump config={config as MoonConfig & { bumpMapPath: string }} texture={texture} />
        ) : (
          <MoonSphereBasic config={config} texture={texture} />
        )}

        {/* Atmospheric haze shell for worlds like Titan or Triton */}
        {config.hasAtmosphere && (
          <mesh name={`${config.name}Atmosphere`}>
            <sphereGeometry args={[config.radius * (config.atmosphereScale ?? 1.045), 64, 48]} />
            <meshStandardMaterial
              color={config.atmosphereColor || '#f59e0b'}
              transparent
              opacity={config.atmosphereOpacity ?? 0.35}
              roughness={0.9}
              depthWrite={false}
            />
          </mesh>
        )}

        <MoonLabel
          id={config.id}
          name={config.name}
          color={config.color}
          radius={config.radius}
        />
      </group>
    </group>
  );
};

interface MoonOrbitSystemProps {
  moons: MoonConfig[];
}

export const MoonOrbitSystem: FC<MoonOrbitSystemProps> = ({ moons }) => {
  return (
    <group name="MoonsSystem">
      {moons.map((moon) => (
        <MoonInstance key={moon.id} config={moon} />
      ))}
    </group>
  );
};
