import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { useAsteroidStore } from '../../state/useAsteroidStore';
import type { NearEarthAsteroid } from '../../science/nasaNeoApi';

interface AsteroidEntityProps {
  asteroid: NearEarthAsteroid;
  lunarDistanceScale: number; // scene units for 1 Lunar Distance (8.0)
  index: number;
}

const AsteroidEntity: FC<AsteroidEntityProps> = ({
  asteroid,
  lunarDistanceScale,
  index,
}) => {
  const selectBody = useFocusStore((state) => state.selectBody);
  const selectedId = useFocusStore((state) => state.selectedId);
  const setActiveAlert = useAsteroidStore((state) => state.setActiveAlert);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const isSelected = selectedId === asteroid.id;

  // Compute fixed 3D approach vector around Earth (distributing angles across catalog)
  const { trajectoryPoints, closestApproachPos, flybyVelocityDir } = useMemo(() => {
    // Distance from Earth center in scene units
    const d = Math.max(2.1, asteroid.missDistanceLunar * lunarDistanceScale);

    // Give each asteroid a unique inclination and approach angle around Earth
    const phi = (index * 1.35) % (Math.PI * 2);
    const theta = (((index * 2.1) % Math.PI) - Math.PI / 2) * 0.55;

    // Closest approach position vector
    const x = d * Math.cos(theta) * Math.cos(phi);
    const y = d * Math.sin(theta);
    const z = d * Math.cos(theta) * Math.sin(phi);
    const closestPos = new THREE.Vector3(x, y, z);

    // Direction of relative flyby velocity (tangent to approach vector)
    const velDir = new THREE.Vector3(-Math.sin(phi), 0.3 * Math.cos(theta), Math.cos(phi)).normalize();

    // Hyperbolic flyby path across Earth's neighborhood (-30 to +30 units)
    const points: THREE.Vector3[] = [];
    const span = 45.0;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = -span + (2.0 * span * i) / steps;
      // Hyperbolic deflection curving slightly around Earth
      const curveOffset = Math.exp(-Math.abs(t) / 12.0) * 0.45;
      const pt = new THREE.Vector3()
        .copy(closestPos)
        .multiplyScalar(1.0 + curveOffset)
        .addScaledVector(velDir, t);
      points.push(pt);
    }

    return {
      trajectoryPoints: points,
      closestApproachPos: closestPos,
      flybyVelocityDir: velDir,
    };
  }, [asteroid.missDistanceLunar, lunarDistanceScale, index]);

  const trajectoryGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
  }, [trajectoryPoints]);

  // Size scaled to asteroid diameter (0.15 to 0.45 scene units)
  const meshSize = useMemo(() => {
    const dMeters = asteroid.diameterMeters.avg;
    return Math.min(0.42, Math.max(0.18, (dMeters / 350.0) * 0.32));
  }, [asteroid.diameterMeters.avg]);

  // Asteroid rocky material
  const rockMaterial = useMemo(() => {
    const isHazard = asteroid.isPotentiallyHazardous;
    return new THREE.MeshStandardMaterial({
      color: isHazard ? '#71717a' : '#52525b',
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });
  }, [asteroid.isPotentiallyHazardous]);

  const trajectoryColor = asteroid.isPotentiallyHazardous ? '#f59e0b' : '#38bdf8';

  // Propagate position based on current simulation clock relative to flyby epoch
  useFrame(() => {
    const { currentJde } = useSimulationClock.getState();
    // Convert current Julian Date to unix ms
    const currentSimMs = (currentJde - 2440587.5) * 86400000.0;
    const deltaHours = (currentSimMs - asteroid.epochDateCloseApproach) / (3600.0 * 1000.0);

    // If within close approach window (+- 36 hours), move along velocity vector
    let currentPos: THREE.Vector3;
    if (Math.abs(deltaHours) <= 36.0) {
      // Scale flyby velocity into scene units per hour
      const speedScale = (asteroid.relativeVelocityKmS / 384400.0) * lunarDistanceScale * 3600.0 * 0.15;
      currentPos = new THREE.Vector3()
        .copy(closestApproachPos)
        .addScaledVector(flybyVelocityDir, deltaHours * speedScale);

      // Trigger active radar alert if within 12 hours of closest approach
      if (Math.abs(deltaHours) < 12.0) {
        setActiveAlert(asteroid);
      }
    } else {
      // Park at periapsis marker
      currentPos = closestApproachPos;
    }

    if (groupRef.current) {
      groupRef.current.position.copy(currentPos);
    }

    // Tumble rotation
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.012;
      meshRef.current.rotation.y += 0.018;
    }
  });

  const trajectoryLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: trajectoryColor,
      transparent: true,
      opacity: isSelected ? 0.65 : 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(trajectoryGeometry, mat);
  }, [trajectoryGeometry, trajectoryColor, isSelected]);

  return (
    <>
      {/* 1. Flyby Trajectory Line passing Earth */}
      <primitive object={trajectoryLine} />

      {/* 2. Interactive Tumbling Asteroid Body */}
      <group
        ref={groupRef}
        name={asteroid.id}
        onClick={(e) => {
          e.stopPropagation();
          selectBody({
            id: asteroid.id,
            name: asteroid.name,
            radius: meshSize,
            type: 'asteroid',
          });
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh ref={meshRef} material={rockMaterial} castShadow>
          <icosahedronGeometry args={[meshSize, 1]} />
        </mesh>

        {/* Pulsing Target Ring for Hazardous Asteroids */}
        {asteroid.isPotentiallyHazardous && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[meshSize * 1.5, meshSize * 1.65, 24]} />
            <meshBasicMaterial
              color="#f59e0b"
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* Minimalist 3D Label */}
        <Html
          position={[0, meshSize + 0.35, 0]}
          center
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              selectBody({
                id: asteroid.id,
                name: asteroid.name,
                radius: meshSize,
                type: 'asteroid',
              });
            }}
            style={{
              pointerEvents: 'auto',
              background: isSelected ? 'rgba(15, 23, 42, 0.94)' : 'rgba(8, 14, 28, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: isSelected
                ? `1.5px solid ${trajectoryColor}`
                : `1px solid ${trajectoryColor}55`,
              borderRadius: '9999px',
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: '#ffffff',
              boxShadow: isSelected ? `0 0 12px ${trajectoryColor}88` : '0 2px 6px rgba(0,0,0,0.5)',
              transform: isSelected ? 'scale(1.08)' : 'scale(1.0)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '11px' }}>🪨</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {asteroid.name}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: trajectoryColor,
              }}
            >
              {asteroid.missDistanceLunar.toFixed(2)} LD
            </span>
          </div>
        </Html>
      </group>
    </>
  );
};

export const AsteroidFlybySystem: FC<{ earthRadius: number }> = ({ earthRadius }) => {
  const showAsteroids = useAsteroidStore((state) => state.showAsteroids);
  const asteroids = useAsteroidStore((state) => state.asteroids);

  // 1 Lunar Distance (384,400 km) = 8.0 units in Earth-relative coordinates
  const lunarDistanceScale = earthRadius * 4.0;

  if (!showAsteroids) return null;

  return (
    <group name="AsteroidFlybySystem">
      {asteroids.map((ast, idx) => (
        <AsteroidEntity
          key={`neo-${ast.id}`}
          asteroid={ast}
          lunarDistanceScale={lunarDistanceScale}
          index={idx}
        />
      ))}
    </group>
  );
};
