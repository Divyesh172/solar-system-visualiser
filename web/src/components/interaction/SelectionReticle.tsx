import { useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFocusStore } from '../../state/useFocusStore';

interface SelectionReticleProps {
  getTargetPosition: (id: string) => THREE.Vector3 | null;
}

/**
 * SelectionReticle: Animated NASA Eyes / Google Earth HUD tracking reticle.
 * 
 * Features:
 * - Automatically tracks active selected planet/moon in 3D space
 * - Gentle rotation and breathing scale animation
 * - Cyan/gold high-contrast HUD brackets
 */
export const SelectionReticle: FC<SelectionReticleProps> = ({ getTargetPosition }) => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const activeTarget = useFocusStore((state) => state.activeTarget);

  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ camera, clock }) => {
    if (!selectedId || !groupRef.current) return;

    const pos = getTargetPosition(selectedId);
    if (pos) {
      groupRef.current.position.copy(pos);
    }

    // Always billboard-align toward the camera
    groupRef.current.quaternion.copy(camera.quaternion);

    // Dynamic rotation & gentle breathing pulse
    if (ringRef.current) {
      const time = clock.getElapsedTime();
      ringRef.current.rotation.z = time * 0.4;
      const pulse = 1.0 + Math.sin(time * 2.5) * 0.03;
      const targetRadius = activeTarget?.radius ?? 2.0;
      const baseRadius = targetRadius * 1.25;
      ringRef.current.scale.set(baseRadius * pulse, baseRadius * pulse, 1);

      // Distance-aware opacity: fade out completely when camera is zoomed in for clean planet observation
      const camDist = pos ? camera.position.distanceTo(pos) : 100;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        // Fade out to 0 opacity when camera is within close inspection distance
        const fadeStart = targetRadius * 4.5;
        const fadeEnd = targetRadius * 10.0;
        const targetOpacity = THREE.MathUtils.clamp(
          (camDist - fadeStart) / (fadeEnd - fadeStart),
          0.0,
          0.65
        );
        mat.opacity = targetOpacity;
      }
    }
  });

  if (!selectedId || selectedId === 'sun') return null;

  return (
    <group ref={groupRef} name="SelectionReticleGroup">
      {/* 1. Animated segmented HUD reticle ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[1.0, 1.03, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
