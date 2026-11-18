import { useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SaturnRings } from './SaturnRings';
import { MoonOrbitSystem, type MoonConfig } from '../moons/MoonOrbitSystem';
import { useFocusStore } from '../../state/useFocusStore';

export interface GasGiantProps {
  id: string;
  name: string;
  texturePath: string;
  radius: number;
  position?: [number, number, number];
  axialTiltDeg?: number;
  rotationPeriodHours?: number;
  hasRings?: boolean;
  ringTexturePath?: string;
  ringInnerRatio?: number;
  ringOuterRatio?: number;
  ringOpacity?: number;
  moons?: MoonConfig[];
  roughness?: number;
  metalness?: number;
}

/**
 * GasGiant: Renders outer solar system gas and ice giants.
 * 
 * Used for:
 * - Jupiter (massive cloud belts, 9.93h fast rotation, 3.13° tilt)
 * - Saturn (golden banded atmosphere, 26.73° tilt, Cassini ring system)
 * - Uranus (aquamarine methane atmosphere, knocked on its side at 97.77° tilt)
 * - Neptune (deep cobalt storm bands, 28.32° tilt)
 */
export const GasGiant: FC<GasGiantProps> = ({
  id,
  name,
  texturePath,
  radius,
  position = [0, 0, 0],
  axialTiltDeg = 0,
  rotationPeriodHours = 10.0,
  hasRings = false,
  ringTexturePath,
  ringInnerRatio,
  ringOuterRatio,
  ringOpacity = 1.0,
  moons,
  roughness = 0.8,
  metalness = 0.0,
}) => {
  const planetGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);

  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);

  // Load atmospheric texture map
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Spin angular speed relative to 24h baseline
  const spinRate = (24.0 / rotationPeriodHours) * 0.15;

  useFrame((_, delta) => {
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y += delta * spinRate;
    }
  });

  const tiltRad = (axialTiltDeg * Math.PI) / 180.0;

  return (
    <group ref={planetGroupRef} position={position} name={name}>
      {/* 1. Obliquity Tilt Group (Fixed astronomical axial tilt) */}
      <group rotation={[tiltRad, 0, 0]}>
        {/* 2. Sidereal Rotation Group */}
        <group ref={spinGroupRef}>
          <mesh
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              selectBody({ id, name, radius, type: 'planet' });
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              hoverBody(id);
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
              hoverBody(null);
            }}
          >
            <sphereGeometry args={[radius, 64, 32]} />
            <meshStandardMaterial
              map={texture}
              roughness={roughness}
              metalness={metalness}
            />
          </mesh>
        </group>

        {/* 3. Saturn / Uranus / Neptune Rings System in Equatorial Plane */}
        {hasRings && (
          <SaturnRings
            planetRadius={radius}
            ringTexturePath={ringTexturePath}
            innerRadiusRatio={ringInnerRatio}
            outerRadiusRatio={ringOuterRatio}
            ringOpacity={ringOpacity}
          />
        )}

        {/* 4. Natural Satellite Moons System */}
        {moons && moons.length > 0 && (
          <MoonOrbitSystem moons={moons} />
        )}
      </group>
    </group>
  );
};
