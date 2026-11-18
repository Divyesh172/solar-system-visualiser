import { useRef, type FC } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSpaceshipStore } from '../../state/useSpaceshipStore';

export const SpaceshipVessel: FC = () => {
  const isFlying = useSpaceshipStore((state) => state.isFlying);
  const groupRef = useRef<THREE.Group>(null);
  const leftPlumeRef = useRef<THREE.Mesh>(null);
  const rightPlumeRef = useRef<THREE.Mesh>(null);
  const visibilityRef = useRef(0);
  const rollAngleRef = useRef(0);
  const lastCameraYawRef = useRef(0);

  const { camera } = useThree();

  useFrame((state, delta) => {
    // Fade in when flying, fade out when parked
    const targetVis = isFlying ? 1.0 : 0.0;
    visibilityRef.current = THREE.MathUtils.lerp(visibilityRef.current, targetVis, delta * 5.0);

    if (!groupRef.current) return;

    groupRef.current.visible = visibilityRef.current > 0.01;
    if (!groupRef.current.visible) return;

    // Calculate camera forward, right, up vectors
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const up = camera.up.clone();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    // Position ship slightly ahead, lower-center in front of camera
    // distance ~4.2 units ahead, -1.2 units down
    const shipPos = camera.position
      .clone()
      .add(forward.clone().multiplyScalar(4.2))
      .add(up.clone().multiplyScalar(-1.15))
      .add(right.clone().multiplyScalar(0.05));

    groupRef.current.position.copy(shipPos);

    // Compute banking / roll based on camera yaw changes
    const currentYaw = Math.atan2(forward.x, forward.z);
    let deltaYaw = currentYaw - lastCameraYawRef.current;
    if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
    lastCameraYawRef.current = currentYaw;

    const targetRoll = THREE.MathUtils.clamp(-deltaYaw * 35.0, -0.65, 0.65);
    rollAngleRef.current = THREE.MathUtils.lerp(rollAngleRef.current, targetRoll, delta * 8.0);

    // Align ship to point in camera forward direction, with roll
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.rotateZ(rollAngleRef.current);

    // Engine thrust plumes flutter/flicker
    const time = state.clock.getElapsedTime();
    const thrustScale = 1.0 + Math.sin(time * 30.0) * 0.18 + Math.cos(time * 45.0) * 0.12;

    if (leftPlumeRef.current && rightPlumeRef.current) {
      leftPlumeRef.current.scale.set(1.0, 1.0, thrustScale * (isFlying ? 1.8 : 0.3));
      rightPlumeRef.current.scale.set(1.0, 1.0, thrustScale * (isFlying ? 1.8 : 0.3));
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {/* 1. Main Aerodynamic Fuselage (Arrowhead Spacecraft) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.32, 1.8, 16]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.25}
          metalness={0.8}
        />
      </mesh>

      {/* 2. Cockpit Glass Canopy */}
      <mesh position={[0, 0.12, 0.2]} scale={[0.18, 0.14, 0.55]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#38bdf8"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* 3. Swept-Back Delta Wings */}
      <mesh position={[0, -0.04, -0.25]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.9, 0.04, 0.7]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Wingtip Rudders / Stabilizers */}
      <mesh position={[-0.92, 0.15, -0.32]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.04, 0.35, 0.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0.92, 0.15, -0.32]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.04, 0.35, 0.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* 4. Twin Ion Engines (Left & Right Nacelles) */}
      <group position={[-0.38, -0.02, -0.7]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.45, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Glowing Engine Bell */}
        <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.09, 16]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
        {/* Pulsing Plasma Plume */}
        <mesh ref={leftPlumeRef} position={[0, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.75, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
        </mesh>
      </group>

      <group position={[0.38, -0.02, -0.7]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.45, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Glowing Engine Bell */}
        <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.09, 16]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
        {/* Pulsing Plasma Plume */}
        <mesh ref={rightPlumeRef} position={[0, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.75, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Dynamic Engine Lighting */}
      <pointLight position={[0, 0, -0.8]} color="#38bdf8" intensity={2.5} distance={6} />
    </group>
  );
};
