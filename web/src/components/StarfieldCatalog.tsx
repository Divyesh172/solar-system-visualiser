import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTELLATIONS } from '../assets/constellations';
import { useSkyStore } from '../state/useSkyStore';
import { CelestialMarkers } from './sky/CelestialMarkers';

/**
 * Famous Anchor Navigation Stars from the Yale Bright Star Catalog (BSC5).
 * [Name, RA (hours), Dec (degrees), V_mag, B-V color index]
 */
const BRIGHT_ANCHOR_STARS: [string, number, number, number, number][] = [
  ['Sirius', 6.75, -16.72, -1.46, 0.00],        // Brightest star (A1V)
  ['Canopus', 6.40, -52.70, -0.74, 0.15],       // F0II
  ['Rigel Kentaurus', 14.66, -60.83, -0.27, 0.71], // Alpha Cen (G2V)
  ['Arcturus', 14.26, 19.18, -0.05, 1.23],      // K1.5III (Orange giant)
  ['Vega', 18.62, 38.78, 0.03, 0.00],          // A0V (Pure white)
  ['Capella', 5.28, 45.99, 0.08, 0.80],        // G3III (Yellow)
  ['Rigel', 5.24, -8.20, 0.13, -0.03],         // B8Ia (Electric blue)
  ['Procyon', 7.65, 5.22, 0.38, 0.42],         // F5IV-V
  ['Betelgeuse', 5.92, 7.41, 0.45, 1.85],      // M1-2Ia (Red supergiant)
  ['Achernar', 1.63, -57.24, 0.46, -0.16],     // B6Vep
  ['Hadar', 14.06, -60.37, 0.61, -0.23],       // B1III
  ['Altair', 19.84, 8.87, 0.77, 0.22],         // A7V
  ['Acrux', 12.44, -63.10, 0.77, -0.26],       // B0.5IV (Southern Cross)
  ['Aldebaran', 4.60, 16.51, 0.85, 1.54],      // K5III (Orange)
  ['Antares', 16.49, -26.43, 0.96, 1.83],      // M1.5Iab (Red)
  ['Spica', 13.42, -11.16, 0.98, -0.23],       // B1III-IV
  ['Pollux', 7.76, 28.03, 1.14, 1.00],         // K0III
  ['Fomalhaut', 22.96, -29.62, 1.17, 0.09],    // A3V
  ['Deneb', 20.69, 45.28, 1.25, 0.09],         // A2Ia (Cygnus)
  ['Mimosa', 12.79, -59.69, 1.25, -0.23],      // B0.5III
  ['Regulus', 10.14, 11.97, 1.36, -0.11],      // B8IV (Leo)
  ['Adhara', 6.98, -28.97, 1.50, -0.21],       // B2II
  ['Castor', 7.58, 31.89, 1.58, 0.04],         // A1V
  ['Gacrux', 12.52, -57.11, 1.64, 1.59],       // M3.5III
  ['Bellatrix', 5.42, 6.35, 1.64, -0.22],      // B2III
  ['Elnath', 5.44, 28.61, 1.65, -0.13],        // B7III
  ['Miaplacidus', 9.22, -69.72, 1.67, 0.00],   // A2IV
  ['Alnilam', 5.60, -1.20, 1.69, -0.19],       // B0Ia (Orion belt)
  ['Alnair', 22.14, -46.96, 1.74, -0.13],      // B7IV
  ['Alioth', 12.90, 55.96, 1.76, -0.02],       // A1III-IV (Big Dipper)
  ['Polaris', 2.53, 89.26, 1.98, 0.60],        // F7Ib (North Star)
];

/**
 * Converts B-V astronomical color index into photorealistic linear RGB.
 */
function bvToColor(bv: number): THREE.Color {
  if (bv < 0.0) return new THREE.Color(0.61, 0.69, 1.00); // O/B: Ice blue
  if (bv < 0.3) return new THREE.Color(0.79, 0.84, 1.00); // A: Blue-white
  if (bv < 0.6) return new THREE.Color(0.97, 0.98, 1.00); // F: Pure white
  if (bv < 0.8) return new THREE.Color(1.00, 0.96, 0.91); // G: Warm solar yellow
  if (bv < 1.4) return new THREE.Color(1.00, 0.82, 0.63); // K: Amber-orange
  return new THREE.Color(1.00, 0.59, 0.33);              // M: Deep crimson-red
}

/**
 * Converts Right Ascension (hours 0..24) and Declination (degrees -90..+90)
 * into a 3D Cartesian unit vector.
 */
export function radecToCartesian(raHours: number, decDeg: number, radius: number): [number, number, number] {
  const alpha = (raHours / 24.0) * Math.PI * 2;
  const delta = (decDeg / 180.0) * Math.PI;

  const cosDelta = Math.cos(delta);
  const x = radius * cosDelta * Math.cos(alpha);
  const y = radius * Math.sin(delta);
  const z = radius * cosDelta * Math.sin(alpha);

  return [x, y, z];
}

/**
 * StarfieldCatalog: WWT-style astronomical celestial dome.
 * 
 * Features:
 * - Real star positions from Yale BSC5 / Hipparcos catalog
 * - Real spectral colors based on B-V index
 * - Magnitude-scaled point size
 * - High-resolution Milky Way galactic plane panorama
 */
export const StarfieldCatalog: React.FC = () => {
  const domeGroupRef = useRef<THREE.Group>(null);
  const showConstellationLines = useSkyStore((state) => state.showConstellationLines);

  // Background Milky Way texture
  const starfieldTexture = useLoader(THREE.TextureLoader, '/textures/starfield.png');
  starfieldTexture.colorSpace = THREE.SRGBColorSpace;

  const radius = 25000; // Far celestial sphere within logarithmic depth buffer bounds

  // Generate 6,000 catalog & field stars (including all constellation nodes)
  const { positions, colors, sizes } = useMemo(() => {
    const totalStars = 6000;
    const pos = new Float32Array(totalStars * 3);
    const col = new Float32Array(totalStars * 3);
    const sz = new Float32Array(totalStars);

    let idx = 0;

    // 1. Combine Bright Anchor Stars with all unique Constellation stars
    const allKeyStars: [string, number, number, number, number][] = [...BRIGHT_ANCHOR_STARS];
    const existingStarNames = new Set(BRIGHT_ANCHOR_STARS.map((s) => s[0].toLowerCase()));

    for (const c of CONSTELLATIONS) {
      for (const st of c.stars) {
        if (!existingStarNames.has(st.name.toLowerCase())) {
          existingStarNames.add(st.name.toLowerCase());
          allKeyStars.push([st.name, st.ra, st.dec, st.mag, st.bv]);
        }
      }
    }

    for (const [, ra, dec, mag, bv] of allKeyStars) {
      const [x, y, z] = radecToCartesian(ra, dec, radius);
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;

      const c = bvToColor(bv);
      col[idx * 3] = c.r;
      col[idx * 3 + 1] = c.g;
      col[idx * 3 + 2] = c.b;

      // Bright stars get prominent screen-space point sizes
      const pointSize = Math.max(2.5, 7.5 - mag * 1.2);
      sz[idx] = pointSize;
      idx++;
    }

    // 2. Procedural astronomical field stars with realistic galactic plane density
    for (; idx < totalStars; idx++) {
      // Uniform spherical distribution with slight galactic equatorial bias
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;

      // Random astronomical spectral type (mostly F, G, K, occasional blue/red)
      const bv = (Math.random() * 2.0) - 0.2;
      const c = bvToColor(bv);
      col[idx * 3] = c.r * (0.6 + Math.random() * 0.4);
      col[idx * 3 + 1] = c.g * (0.6 + Math.random() * 0.4);
      col[idx * 3 + 2] = c.b * (0.6 + Math.random() * 0.4);

      // Faint field stars (magnitudes 4 to 6.5)
      sz[idx] = 1.0 + Math.random() * 1.8;
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [radius]);

  // Generate constellation stick-figure line segments
  const { linePositions, lineColors } = useMemo(() => {
    const segments: { p1: [number, number, number]; p2: [number, number, number]; color: THREE.Color }[] = [];

    const zodiacColor = new THREE.Color('#fbbf24'); // Amber gold for Zodiac
    const majorColor = new THREE.Color('#38bdf8');  // Cyan for Northern / Major
    const southernColor = new THREE.Color('#a78bfa'); // Lavender for Southern

    for (const c of CONSTELLATIONS) {
      const col = c.family === 'zodiac' ? zodiacColor : c.family === 'southern' ? southernColor : majorColor;
      for (const [[ra1, dec1], [ra2, dec2]] of c.lines) {
        const p1 = radecToCartesian(ra1, dec1, radius * 0.998);
        const p2 = radecToCartesian(ra2, dec2, radius * 0.998);
        segments.push({ p1, p2, color: col });
      }
    }

    const pos = new Float32Array(segments.length * 6);
    const col = new Float32Array(segments.length * 6);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      // Vertex 1
      pos[i * 6] = seg.p1[0];
      pos[i * 6 + 1] = seg.p1[1];
      pos[i * 6 + 2] = seg.p1[2];
      col[i * 6] = seg.color.r;
      col[i * 6 + 1] = seg.color.g;
      col[i * 6 + 2] = seg.color.b;

      // Vertex 2
      pos[i * 6 + 3] = seg.p2[0];
      pos[i * 6 + 4] = seg.p2[1];
      pos[i * 6 + 5] = seg.p2[2];
      col[i * 6 + 3] = seg.color.r;
      col[i * 6 + 4] = seg.color.g;
      col[i * 6 + 5] = seg.color.b;
    }

    return { linePositions: pos, lineColors: col };
  }, [radius]);

  // Keep entire celestial sphere centered on camera to eliminate parallax
  useFrame(({ camera }) => {
    if (domeGroupRef.current) {
      domeGroupRef.current.position.copy(camera.position);
    }
  });

  return (
    <group ref={domeGroupRef}>
      {/* 1. Inverted celestial sphere with deep Milky Way galactic plane */}
      <mesh renderOrder={-100}>
        <sphereGeometry args={[radius * 1.02, 64, 32]} />
        <meshBasicMaterial
          map={starfieldTexture}
          side={THREE.BackSide}
          depthWrite={false}
          depthTest={true}
          fog={false}
        />
      </mesh>

      {/* 2. Crisp catalog point stars with true spectral colors */}
      <points renderOrder={-99}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2.0}
          sizeAttenuation={false}
          vertexColors
          transparent
          opacity={0.92}
          depthWrite={false}
          depthTest={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3. Planetarium Constellation Stick Figure Lines */}
      {showConstellationLines && (
        <lineSegments renderOrder={-98}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[linePositions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[lineColors, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.42}
            depthWrite={false}
            depthTest={true}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* 4. Planetarium Constellation Labels & Deep Sky Object Markers */}
      <CelestialMarkers />
    </group>
  );
};
