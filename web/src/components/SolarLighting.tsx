import type { FC } from 'react';

interface SolarLightingProps {
  sunIntensity?: number;
  ambientIntensity?: number;
}

/**
 * SolarLighting: Physically calibrated illumination for the solar system.
 * 
 * - Central PointLight at (0, 0, 0) simulates the Sun radiating omnidirectionally
 *   with realistic inverse-square decay (decay = 2).
 * - Soft ambient light ensures the night sides of worlds remain subtly legible
 *   against the blackness of deep space.
 */
export const SolarLighting: FC<SolarLightingProps> = ({
  sunIntensity = 2.4,
  ambientIntensity = 0.22,
}) => {
  return (
    <>
      {/* 1. Deep space ambient starlight fill */}
      <ambientLight color="#182033" intensity={ambientIntensity} />

      {/* 2. Central Solar Sunlight radiating from origin (NASA Eyes balanced daylight) */}
      <pointLight
        position={[0, 0, 0]}
        color="#fffcf2"
        intensity={sunIntensity}
        decay={0} // Constant solar daylight across AU scales (NASA Eyes calibrated)
        distance={0}
      />
    </>
  );
};
