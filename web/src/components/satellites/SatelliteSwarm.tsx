import { useMemo, useRef, useState, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { SATELLITE_LIST, type SatelliteMetadata } from '../../science/satelliteCatalog';
import { propagateSatellite, getSatelliteOrbitLoop } from '../../science/satellitePropagator';
import { jdeToDate } from '../../science/time';

interface SatelliteModelProps {
  id: string;
  color: string;
}

/**
 * Procedural low-poly 3D models for iconic spacecraft.
 */
const SatelliteModel: FC<SatelliteModelProps> = ({ id, color }) => {
  if (id === 'iss') {
    // International Space Station: Central pressurized modules + truss + golden solar wings
    return (
      <group scale={[0.075, 0.075, 0.075]}>
        {/* Central Habitation Cylinder */}
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 2.2, 16]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Main Integrated Truss Structure */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.18, 4.2, 0.18]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.4} />
        </mesh>
        {/* Left Solar Panel Wings */}
        <mesh position={[-2.4, 0, 0]}>
          <boxGeometry args={[1.5, 0.02, 1.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} roughness={0.2} />
        </mesh>
        {/* Right Solar Panel Wings */}
        <mesh position={[2.4, 0, 0]}>
          <boxGeometry args={[1.5, 0.02, 1.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} roughness={0.2} />
        </mesh>
        {/* Radiator Panels */}
        <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.02, 0.8, 0.6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  if (id === 'hubble') {
    // Hubble Space Telescope: Polished silver tube + solar panels + aperture baffle
    return (
      <group scale={[0.065, 0.065, 0.065]}>
        {/* Main Telescope Tube Body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.55, 2.0, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Aperture Door Flap */}
        <mesh position={[0, 0.3, 1.0]} rotation={[-Math.PI / 6, 0, 0]}>
          <cylinderGeometry args={[0.46, 0.46, 0.04, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Twin Solar Panel Wings */}
        <mesh position={[-1.3, 0, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.6]} />
          <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.25} roughness={0.2} />
        </mesh>
        <mesh position={[1.3, 0, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.6]} />
          <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.25} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  if (id === 'tiangong') {
    // Tiangong Space Station: T-shaped core module + laboratory cabins + red/golden wings
    return (
      <group scale={[0.065, 0.065, 0.065]}>
        {/* Tianhe Core Module */}
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 2.0, 16]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Crossed Experiment Lab Modules (T-Shape) */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 2.4, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Flexible High-Efficiency Solar Wings */}
        <mesh position={[-1.9, -0.3, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.8]} />
          <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.2} roughness={0.3} />
        </mesh>
        <mesh position={[1.9, -0.3, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.8]} />
          <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.2} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  // Default / Landsat: Satellite Cube Body + Solar Wing + Sensor Pod
  return (
    <group scale={[0.06, 0.06, 0.06]}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Earth Sensor Lens */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.2, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} />
      </mesh>
      {/* Single Solar Wing */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[1.3, 0.02, 0.7]} />
        <meshStandardMaterial color="#10b981" emissive="#047857" emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
    </group>
  );
};

interface SatelliteInstanceProps {
  metadata: SatelliteMetadata;
  earthRadius: number;
}

const SatelliteInstance: FC<SatelliteInstanceProps> = ({ metadata, earthRadius }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const selectedId = useFocusStore((state) => state.selectedId);
  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);
  const currentJde = useSimulationClock((state) => state.currentJde);

  const isSelected = selectedId === metadata.id;

  // Precomputed closed 3D orbit trajectory loop (recomputed only when date changes significantly)
  const orbitGeometry = useMemo(() => {
    const date = jdeToDate(currentJde);
    const loopPoints = getSatelliteOrbitLoop(metadata, date, earthRadius, 96);
    const points = loopPoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [metadata, earthRadius, Math.floor(currentJde / 2)]);

  useFrame(() => {
    const liveJde = useSimulationClock.getState().currentJde;
    const date = jdeToDate(liveJde);
    const telemetry = propagateSatellite(metadata, date, earthRadius);

    if (groupRef.current && telemetry.isValid) {
      groupRef.current.position.set(
        telemetry.positionScene[0],
        telemetry.positionScene[1],
        telemetry.positionScene[2]
      );
      // Align satellite sensors facing directly toward Earth at (0, 0, 0)
      groupRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group>
      {/* 1. Closed 3D Orbit Path Trajectory Loop */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={metadata.colorHex}
          transparent
          opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.28}
          depthWrite={false}
        />
      </lineLoop>

      {/* 2. Interactive Satellite Group (Named with id so CameraController & SelectionReticle can target it) */}
      <group
        ref={groupRef}
        name={metadata.id}
        onClick={(e) => {
          e.stopPropagation();
          selectBody({
            id: metadata.id,
            name: metadata.name,
            radius: 0.25,
            type: 'satellite',
          });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setIsHovered(true);
          hoverBody(metadata.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setIsHovered(false);
          hoverBody(null);
        }}
      >
        {/* Invisible Click Raycast Hit Sphere (Ensures effortless mobile & desktop clicking) */}
        <mesh visible={false}>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* 3D Spacecraft Model */}
        <SatelliteModel id={metadata.id} color={metadata.colorHex} />

        {/* Floating Label */}
        <Html
          position={[0, 0.32, 0]}
          center
          zIndexRange={[80, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: isSelected ? 1.0 : isHovered ? 0.95 : 0.65,
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isSelected
                ? 'rgba(56, 189, 248, 0.35)'
                : isHovered
                ? 'rgba(15, 23, 42, 0.9)'
                : 'rgba(15, 23, 42, 0.75)',
              border: `1px solid ${isSelected ? metadata.colorHex : 'rgba(255, 255, 255, 0.18)'}`,
              borderRadius: '10px',
              padding: '2px 6px',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: isSelected ? `0 0 10px ${metadata.colorHex}` : 'none',
            }}
          >
            <span>{metadata.iconEmoji}</span>
            <span>{metadata.shortName}</span>
          </div>
        </Html>
      </group>
    </group>
  );
};

export interface SatelliteSwarmProps {
  earthRadius: number;
  visible?: boolean;
}

export const SatelliteSwarm: FC<SatelliteSwarmProps> = ({ earthRadius, visible = true }) => {
  if (!visible) return null;

  return (
    <group name="SatelliteSwarm">
      {SATELLITE_LIST.map((satellite) => (
        <SatelliteInstance
          key={satellite.id}
          metadata={satellite}
          earthRadius={earthRadius}
        />
      ))}
    </group>
  );
};
