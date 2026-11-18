import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { useAsteroidStore } from '../../state/useAsteroidStore';
import type { NearEarthAsteroid } from '../../science/nasaNeoApi';

interface AsteroidEntityProps {
  asteroid: NearEarthAsteroid;
  earthRadius: number;
  index: number;
}

const AsteroidEntity: FC<AsteroidEntityProps> = ({
  asteroid,
  earthRadius,
  index,
}) => {
  const selectBody = useFocusStore((state) => state.selectBody);
  const selectedId = useFocusStore((state) => state.selectedId);
  const setActiveAlert = useAsteroidStore((state) => state.setActiveAlert);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const isSelected = selectedId === asteroid.id;

  // High-res surface textures: hazardous asteroids get a reddish/amber rocky look,
  // regular NEOs get a neutral grey carbonaceous chondrite surface.
  const rockyTexture = useTexture('/textures/asteroid_rocky.jpg');
  const hazardTexture = useTexture('/textures/asteroid_hazard.jpg');
  const surfaceTexture = asteroid.isPotentiallyHazardous ? hazardTexture : rockyTexture;

  // Scaled orbital reference distances
  // Earth surface is at earthRadius (2.2). Satellites orbit up to earthRadius + 0.55 (2.75).
  // Moon is at earthRadius * 3.8 (8.36), representing 1.0 Lunar Distance (LD).
  const minSafeDistance = earthRadius + 1.4; // 3.6 units — generous vacuum clearance outside Earth & satellites
  const lunarOrbitDistance = earthRadius * 3.8; // 8.36 units = 1.0 LD

  // Compute fixed 3D approach vector around Earth (distributing angles across catalog)
  const { trajectoryPoints, closestApproachPos, flybyVelocityDir, periapsisDistance, curveDeflection } = useMemo(() => {
    // Proportional visual distance calculation:
    // Sub-lunar asteroids (< 1 LD) smoothly span from minSafeDistance (3.6) to lunarOrbitDistance (8.36).
    // Trans-lunar asteroids (> 1 LD) extend outward without cluttering.
    let d: number;
    const missLD = Math.max(0.005, asteroid.missDistanceLunar);
    if (missLD <= 1.0) {
      d = minSafeDistance + (lunarOrbitDistance - minSafeDistance) * Math.pow(missLD, 0.7);
    } else if (missLD <= 3.0) {
      d = lunarOrbitDistance + (missLD - 1.0) * 2.8;
    } else {
      d = lunarOrbitDistance + 5.6 + Math.log2(missLD / 3.0 + 1.0) * 6.0;
    }

    // Golden angle spiral distribution to prevent any two asteroids or labels from overlapping
    const goldenAngle = 2.399963229728653; // ~137.5°
    const yNorm = ((index % 8) / 7) * 1.3 - 0.65; // [-0.65, +0.65] avoiding polar singularities
    const rAtY = Math.sqrt(Math.max(0.1, 1 - yNorm * yNorm));
    const phi = index * goldenAngle;

    const dirX = Math.cos(phi) * rAtY;
    const dirY = yNorm;
    const dirZ = Math.sin(phi) * rAtY;
    const approachDir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

    // Closest approach position vector (at periapsis distance d from Earth center)
    const closestPos = approachDir.clone().multiplyScalar(d);

    // Strictly orthogonal velocity direction: velDir · closestPos = 0
    // This mathematically guarantees that the flyby path NEVER dips closer to Earth than d.
    const refVec = Math.abs(approachDir.y) < 0.85
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const tangent1 = new THREE.Vector3().crossVectors(approachDir, refVec).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(approachDir, tangent1).normalize();

    // Unique orbital inclination plane angle for each asteroid
    const planeAngle = index * 1.35 + 0.5;
    const velDir = new THREE.Vector3()
      .addScaledVector(tangent1, Math.cos(planeAngle))
      .addScaledVector(tangent2, Math.sin(planeAngle))
      .normalize();

    // Hyperbolic flyby path across Earth's neighborhood.
    // At t = 0 (closest approach), distance is exactly d.
    // For |t| > 0, the trajectory bends away from Earth into deep space, so distance is always >= d >= 3.6.
    const points: THREE.Vector3[] = [];
    const span = Math.max(35.0, d * 3.5);
    const steps = 70;
    const deflectionScale = Math.max(12.0, d * 1.8);

    for (let i = 0; i <= steps; i++) {
      const t = -span + (2.0 * span * i) / steps;
      // Hyperbolic deflection curving away from Earth (always positive):
      const curveOffset = (t * t) / (2.0 * deflectionScale * d);
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
      periapsisDistance: d,
      curveDeflection: deflectionScale,
    };
  }, [asteroid.missDistanceLunar, minSafeDistance, lunarOrbitDistance, index]);

  const trajectoryGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
  }, [trajectoryPoints]);

  // Size scaled to asteroid diameter (0.15 to 0.45 scene units)
  const meshSize = useMemo(() => {
    const dMeters = asteroid.diameterMeters.avg;
    return Math.min(0.42, Math.max(0.18, (dMeters / 350.0) * 0.32));
  }, [asteroid.diameterMeters.avg]);

  // Asteroid rocky material — textured with NASA-sourced surface maps
  const rockMaterial = useMemo(() => {
    const isHazard = asteroid.isPotentiallyHazardous;
    return new THREE.MeshStandardMaterial({
      map: surfaceTexture,
      color: isHazard ? '#a86030' : '#7a7a7a',
      roughness: 0.94,
      metalness: 0.06,
      flatShading: false,
    });
  }, [asteroid.isPotentiallyHazardous, surfaceTexture]);

  const trajectoryColor = asteroid.isPotentiallyHazardous ? '#f59e0b' : '#38bdf8';

  // Propagate position based on current simulation clock relative to flyby epoch
  useFrame(() => {
    const { currentJde } = useSimulationClock.getState();
    // Convert current Julian Date to unix ms
    const currentSimMs = (currentJde - 2440587.5) * 86400000.0;
    const deltaHours = (currentSimMs - asteroid.epochDateCloseApproach) / (3600.0 * 1000.0);

    // If within close approach window (+- 36 hours), move along hyperbolic trajectory
    let currentPos: THREE.Vector3;
    if (Math.abs(deltaHours) <= 36.0) {
      // Scale flyby velocity into scene units per hour
      const speedScale = (asteroid.relativeVelocityKmS / 384400.0) * lunarOrbitDistance * 3600.0 * 0.15;
      const t = deltaHours * speedScale;
      const curveOffset = (t * t) / (2.0 * curveDeflection * periapsisDistance);
      currentPos = new THREE.Vector3()
        .copy(closestApproachPos)
        .multiplyScalar(1.0 + curveOffset)
        .addScaledVector(flybyVelocityDir, t);

      // Trigger active radar alert if within 12 hours of closest approach
      if (Math.abs(deltaHours) < 12.0) {
        setActiveAlert(asteroid);
      }
    } else {
      // Park at periapsis marker (safely outside Earth at distance d >= 3.6)
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
          <icosahedronGeometry args={[meshSize, 2]} />
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

  if (!showAsteroids) return null;

  return (
    <group name="AsteroidFlybySystem">
      {asteroids.map((ast, idx) => (
        <AsteroidEntity
          key={`neo-${ast.id}`}
          asteroid={ast}
          earthRadius={earthRadius}
          index={idx}
        />
      ))}
    </group>
  );
};
