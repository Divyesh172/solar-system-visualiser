import { Suspense, type FC, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

interface SolarCanvasProps {
  children?: ReactNode;
}

/**
 * SolarCanvas: High-precision astronomical WebGL viewport.
 * 
 * Features:
 * - logarithmicDepthBuffer: true: Eliminates z-fighting across astronomical scales (millions of units)
 * - sRGB color encoding for photorealistic NASA/USGS texture fidelity
 * - dpr clamping: Limits Retina/High-DPI rendering to 2x to maintain 60-120 FPS on mobile/laptops
 * - Wide dynamic range perspective camera (near: 0.1 to far: 2,000,000)
 */
export const SolarCanvas: FC<SolarCanvasProps> = ({ children }) => {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#02040a' }}>
      <Canvas
        gl={{
          antialias: true,
          logarithmicDepthBuffer: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          preserveDrawingBuffer: true,
        }}
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
        camera={{
          position: [0, 80, 160],
          fov: 45,
          near: 0.1,
          far: 2_000_000,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#010206']} />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
};
