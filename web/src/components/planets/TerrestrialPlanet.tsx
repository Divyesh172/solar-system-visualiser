import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useFocusStore } from '../../state/useFocusStore';

export interface TerrestrialPlanetProps {
  id: string;
  name: string;
  texturePath: string;
  bumpMapPath?: string;
  bumpScale?: number;
  radius: number;
  position?: [number, number, number];
  axialTiltDeg?: number;
  rotationPeriodHours?: number; // Negative indicates retrograde spin
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereScale?: number;
  atmosphereIntensity?: number;
  roughness?: number;
  metalness?: number;
}

// Thin Atmospheric Limb Glow Shader (for Mars CO2 and hazy atmospheres)
const ThinAtmosphereShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
    uColor: { value: new THREE.Color('#e27b58') },
    uIntensity: { value: 1.0 },
  },
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform vec3 uSunDirection;
    uniform vec3 uColor;
    uniform float uIntensity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vNormal);
      vec3 sunDir = normalize(uSunDirection);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      // Rim Fresnel factor
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      float intensity = pow(rim, 3.5) * uIntensity;

      // Daylight mask: fade on deep night side
      float NdotL = dot(normal, sunDir);
      float dayMask = smoothstep(-0.25, 0.3, NdotL);

      gl_FragColor = vec4(uColor * intensity, intensity * dayMask * 0.75);
    }
  `,
};

/**
 * TerrestrialPlanet: High-fidelity rocky celestial body with optional atmospheric limb.
 * 
 * Used for:
 * - Mercury (airless, cratered)
 * - Venus (dense sulfuric cloud deck with retrograde spin)
 * - Mars (thin CO2 salmon-pink atmosphere)
 * - Earth's Moon (stark vacuum shadows)
 */
export const TerrestrialPlanet: React.FC<TerrestrialPlanetProps> = ({
  id,
  name,
  texturePath,
  bumpMapPath,
  bumpScale = 0.04,
  radius,
  position = [0, 0, 0],
  axialTiltDeg = 0,
  rotationPeriodHours = 24.0,
  hasAtmosphere = false,
  atmosphereColor = '#e27b58',
  atmosphereScale = 1.04,
  atmosphereIntensity = 1.0,
  roughness = 0.85,
  metalness = 0.05,
}) => {
  const planetGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const atmoMatRef = useRef<THREE.ShaderMaterial>(null);

  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);

  // Load high-resolution planetary albedo texture and optional bump map
  const [texture, bumpTexture] = useLoader(THREE.TextureLoader, [
    texturePath,
    bumpMapPath || texturePath,
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (bumpMapPath) {
    bumpTexture.colorSpace = THREE.NoColorSpace;
  }

  // Custom atmosphere material if present
  const atmosphereMaterial = useMemo(() => {
    if (!hasAtmosphere) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
        uColor: { value: new THREE.Color(atmosphereColor) },
        uIntensity: { value: atmosphereIntensity },
      },
      vertexShader: ThinAtmosphereShader.vertexShader,
      fragmentShader: ThinAtmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, [hasAtmosphere, atmosphereColor, atmosphereIntensity]);

  // Compute rotation angular speed relative to 24h baseline
  const spinRate = (24.0 / rotationPeriodHours) * 0.15;

  useFrame((_, delta) => {
    // 1. Advance sidereal planetary rotation
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y += delta * spinRate;
    }

    // 2. Update solar incident vector for atmosphere
    if (hasAtmosphere && atmoMatRef.current && planetGroupRef.current) {
      const worldPos = new THREE.Vector3();
      planetGroupRef.current.getWorldPosition(worldPos);
      const sunDir = new THREE.Vector3(0, 0, 0).sub(worldPos).normalize();
      atmoMatRef.current.uniforms.uSunDirection.value.copy(sunDir);
    }
  });

  const tiltRad = (axialTiltDeg * Math.PI) / 180.0;

  return (
    <group ref={planetGroupRef} position={position} name={name}>
      {/* 1. Obliquity Tilt Group */}
      <group rotation={[tiltRad, 0, 0]}>
        {/* 2. Sidereal Rotation Group */}
        <group ref={spinGroupRef}>
          <mesh
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              selectBody({ id, name, radius, type: 'planet' });
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              hoverBody(id);
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
              hoverBody(null);
            }}
          >
            <sphereGeometry args={[radius, 64, 32]} />
            <meshStandardMaterial
              map={texture}
              bumpMap={bumpMapPath ? bumpTexture : undefined}
              bumpScale={bumpMapPath ? bumpScale : 0}
              roughness={roughness}
              metalness={metalness}
            />
          </mesh>
        </group>

        {/* 3. Optional Atmospheric Limb Shell */}
        {hasAtmosphere && atmosphereMaterial && (
          <mesh>
            <sphereGeometry args={[radius * atmosphereScale, 64, 32]} />
            <primitive object={atmosphereMaterial} ref={atmoMatRef} attach="material" />
          </mesh>
        )}
      </group>
    </group>
  );
};
