import { useMemo, useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { getLunarEphemeris } from '../../science/astroEngineAdapter';
import { MoonLabel } from '../interaction/MoonLabel';

interface EarthMoonProps {
  earthRadius: number;
}

/**
 * EarthMoon: Earth's natural satellite.
 * 
 * High-Precision Astronomical Features:
 * - Analytical ELP-2000/82 lunar ephemeris driven by astronomy-engine
 * - Real 3D orbital inclination (5.14°) & perigee/apogee distance variation
 * - Authentic Tidal Locking: Near side (with maria) always points directly at Earth
 * - Precomputed subtle 3D orbit line around Earth
 */
export const EarthMoon: FC<EarthMoonProps> = ({ earthRadius }) => {
  const moonPivotRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const lastJdeRef = useRef<number>(-1);

  const currentJde = useSimulationClock((state) => state.currentJde);
  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);

  // Load real NASA 2K lunar photographic texture & elevation relief bump map
  const [moonTexture, moonBumpMap] = useLoader(THREE.TextureLoader, [
    '/textures/moon_earth.png',
    '/textures/moon_bump.png',
  ]);
  moonTexture.colorSpace = THREE.SRGBColorSpace;

  // Scale: Moon radius is ~0.27 * Earth radius
  const moonRadius = earthRadius * 0.27;
  // Scaled distance so Moon is clearly distinct and navigable
  const orbitDistance = earthRadius * 3.8;

  // Sample authentic 3D lunar orbit loop around Earth
  const orbitGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const sampleJde = currentJde + (i / segments) * 27.3216;
      const ephem = getLunarEphemeris(sampleJde);
      const distScale = (ephem.distanceAu / 0.00257) * orbitDistance;
      points.push(
        new THREE.Vector3(
          ephem.direction[0] * distScale,
          ephem.direction[1] * distScale,
          ephem.direction[2] * distScale
        )
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [orbitDistance, Math.floor(currentJde / 10)]);

  // High-fidelity sphere geometry with 64x64 segments and near-side (+Z) alignment
  const moonGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(moonRadius, 64, 64);
    // Rotate geometry so u=0.5 (near side with maria) aligns with +Z (direction of lookAt)
    geo.rotateY(-Math.PI / 2);
    return geo;
  }, [moonRadius]);

  useFrame(() => {
    const { currentJde: liveJde, isPaused } = useSimulationClock.getState();
    if (isPaused && lastJdeRef.current === liveJde) return;
    lastJdeRef.current = liveJde;

    const lunarEphem = getLunarEphemeris(liveJde);
    if (moonMeshRef.current) {
      // 1. Orbital position around Earth (scaled by actual perigee/apogee distance ratio)
      const distScale = (lunarEphem.distanceAu / 0.00257) * orbitDistance;
      moonMeshRef.current.position.set(
        lunarEphem.direction[0] * distScale,
        lunarEphem.direction[1] * distScale,
        lunarEphem.direction[2] * distScale
      );

      // 2. Authentic Tidal Locking: Near side always points directly at Earth center at (0, 0, 0)
      moonMeshRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group ref={moonPivotRef}>
      {/* 1. Subtle 3D lunar orbit trail */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.35} depthWrite={false} />
      </lineLoop>

      {/* 2. Tidally Locked Photorealistic Moon Mesh */}
      <mesh
        ref={moonMeshRef}
        geometry={moonGeometry}
        castShadow
        receiveShadow
        name="Moon"
        onClick={(e) => {
          e.stopPropagation();
          selectBody({ id: 'moon', name: 'Moon', radius: moonRadius, type: 'moon' });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverBody('moon');
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          hoverBody(null);
        }}
      >
        <meshStandardMaterial
          map={moonTexture}
          bumpMap={moonBumpMap}
          bumpScale={0.038}
          roughness={0.92}
          metalness={0.0}
        />
        <MoonLabel id="moon" name="Moon" color="#cbd5e1" radius={moonRadius} />
      </mesh>
    </group>
  );
};
