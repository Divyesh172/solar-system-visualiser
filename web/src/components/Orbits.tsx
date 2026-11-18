import { useMemo, type FC } from 'react';
import * as THREE from 'three';
import { generateClosedOrbitPoints, J2000_JDE, type PlanetKey } from '../science/ephemeris';
import { CoordinateProjector } from '../science/transforms';

interface OrbitConfig {
  id: PlanetKey;
  name: string;
  color: string;
  opacity: number;
}

const PLANET_ORBITS: OrbitConfig[] = [
  { id: 'mercury', name: 'Mercury', color: '#c2c5cc', opacity: 0.35 },
  { id: 'venus',   name: 'Venus',   color: '#e3bb76', opacity: 0.40 },
  { id: 'earth',   name: 'Earth',   color: '#4fa3e3', opacity: 0.50 },
  { id: 'mars',    name: 'Mars',    color: '#e06648', opacity: 0.45 },
  { id: 'jupiter', name: 'Jupiter', color: '#d9a066', opacity: 0.40 },
  { id: 'saturn',  name: 'Saturn',  color: '#e6cc80', opacity: 0.40 },
  { id: 'uranus',  name: 'Uranus',  color: '#73d9d9', opacity: 0.40 },
  { id: 'neptune', name: 'Neptune', color: '#4d88ff', opacity: 0.45 },
];

interface OrbitsProps {
  projector?: CoordinateProjector;
}

/**
 * Orbits: Precomputes static 180-segment closed orbit loops for all 8 planets.
 * 
 * Performance:
 * - 0 GPU buffer allocations per frame (resolving the #1 lag bottleneck of the Rust/Bevy build)
 * - Rendered with Three.js LineLoop and depthWrite: false
 */
export const Orbits: FC<OrbitsProps> = ({ projector = new CoordinateProjector() }) => {
  const orbitGeometries = useMemo(() => {
    return PLANET_ORBITS.map((config) => {
      const astroPoints = generateClosedOrbitPoints(config.id, J2000_JDE, 180);
      const scenePoints = astroPoints.map((pt) => {
        const [x, y, z] = projector.projectPosition(pt);
        return new THREE.Vector3(x, y, z);
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(scenePoints);
      return {
        id: config.id,
        geometry,
        color: config.color,
        opacity: config.opacity,
      };
    });
  }, [projector]);

  return (
    <group name="OrbitsGroup">
      {orbitGeometries.map((orbit) => (
        <lineLoop key={orbit.id} geometry={orbit.geometry}>
          <lineBasicMaterial
            color={orbit.color}
            transparent
            opacity={orbit.opacity}
            depthWrite={false}
          />
        </lineLoop>
      ))}
    </group>
  );
};
