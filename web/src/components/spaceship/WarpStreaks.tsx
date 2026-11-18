import { useMemo, useRef, type FC } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSpaceshipStore } from '../../state/useSpaceshipStore';

const NUM_STREAKS = 220;
const TUNNEL_RADIUS = 28;
const TUNNEL_LENGTH = 160;

export const WarpStreaks: FC = () => {
  const isFlying = useSpaceshipStore((state) => state.isFlying);
  const opacityRef = useRef(0);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { camera } = useThree();

  // Create initial random points distributed in a cylinder around the camera
  const { positions, baseData } = useMemo(() => {
    const pos = new Float32Array(NUM_STREAKS * 2 * 3);
    const data: { radius: number; angle: number; z: number; speed: number; length: number }[] = [];

    for (let i = 0; i < NUM_STREAKS; i++) {
      const radius = 2.5 + Math.random() * TUNNEL_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const z = -Math.random() * TUNNEL_LENGTH;
      const speed = 140 + Math.random() * 120;
      const length = 4.0 + Math.random() * 8.0;

      data.push({ radius, angle, z, speed, length });

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Start vertex
      pos[i * 6 + 0] = x;
      pos[i * 6 + 1] = y;
      pos[i * 6 + 2] = z;

      // End vertex (streak tail)
      pos[i * 6 + 3] = x;
      pos[i * 6 + 4] = y;
      pos[i * 6 + 5] = z - length;
    }

    return { positions: pos, baseData: data };
  }, []);

  useFrame((_, delta) => {
    // Smooth fade in / fade out of warp streaks
    const targetOpacity = isFlying ? 0.9 : 0.0;
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 6.0);

    if (!linesRef.current) return;

    const mat = linesRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = opacityRef.current;
    linesRef.current.visible = opacityRef.current > 0.01;

    if (!linesRef.current.visible) return;

    // Align warp streak tunnel with camera position & orientation
    linesRef.current.position.copy(camera.position);
    linesRef.current.quaternion.copy(camera.quaternion);

    // Update streak positions rushing past camera
    const geom = linesRef.current.geometry;
    const posAttr = geom.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < NUM_STREAKS; i++) {
      const d = baseData[i];
      d.z += d.speed * delta;

      if (d.z > 20) {
        d.z = -TUNNEL_LENGTH;
      }

      const x = Math.cos(d.angle) * d.radius;
      const y = Math.sin(d.angle) * d.radius;

      // Head
      arr[i * 6 + 0] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = d.z;

      // Tail
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y;
      arr[i * 6 + 5] = d.z - d.length;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#7dd3fc"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};
