import { useMemo, useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface SaturnRingsProps {
  planetRadius: number;
  innerRadiusRatio?: number; // Inner ring starts ~1.25 * planetRadius
  outerRadiusRatio?: number; // Outer ring extends to ~2.42 * planetRadius
  ringTexturePath?: string;
  ringOpacity?: number;
}

// ---------------------------------------------------------------------------
// GLSL Shader for Saturn's Rings featuring Saturn's Globe Shadow & LogDepth
// ---------------------------------------------------------------------------
const SaturnRingShader = {
  uniforms: {
    uRingTexture: { value: null as THREE.Texture | null },
    uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
    uPlanetRadius: { value: 1.0 },
    uRingOpacity: { value: 1.0 },
  },
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vLocalPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform sampler2D uRingTexture;
    uniform vec3 uSunDirection;
    uniform float uPlanetRadius;
    uniform float uRingOpacity;

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vWorldPosition;

    void main() {
      #include <logdepthbuf_fragment>

      // 1. Sample ring texture with radial UV mapping (vUv.x is radial distance 0..1)
      vec4 ringColor = texture2D(uRingTexture, vec2(vUv.x, 0.5));

      if (ringColor.a < 0.01) {
        discard; // Transparent gaps like Cassini Division & Encke Gap
      }

      // 2. Calculate Planet Globe Shadow on Rings
      vec3 L = normalize(uSunDirection);
      vec3 P = vLocalPosition;

      float shadow = 1.0;
      float PdotL = dot(P, L);

      // If ray moves toward the Sun and goes behind the planet center (PdotL < 0)
      if (PdotL < 0.0) {
        float distSq = dot(P, P) - (PdotL * PdotL);
        float rSq = uPlanetRadius * uPlanetRadius;
        if (distSq < rSq * 1.04) {
          // Soft penumbra transition at shadow boundary
          float penumbra = smoothstep(rSq * 0.95, rSq * 1.02, distSq);
          shadow = mix(0.25, 1.0, penumbra);
        }
      }

      // 3. Subtle ambient light on rings so they remain visible from unlit side
      vec3 finalRgb = ringColor.rgb * shadow;

      gl_FragColor = vec4(finalRgb, ringColor.a * uRingOpacity * 0.92);
    }
  `,
};

/**
 * Procedural UV generator for Annular Disc (RingGeometry).
 * Maps radial distance from inner to outer radius along U (0.0 to 1.0).
 */
function createPlanetaryRingGeometry(innerRadius: number, outerRadius: number, thetaSegments: number): THREE.BufferGeometry {
  const geo = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments, 8);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;

  // Remap UV coordinates radially so texture maps radially across the rings
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const u = (dist - innerRadius) / (outerRadius - innerRadius);
    const v = (Math.atan2(y, x) / (Math.PI * 2.0)) + 0.5;
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;

  return geo;
}

/**
 * SaturnRings: Photorealistic planetary ring system with Cassini Division and globe shadow.
 */
export const SaturnRings: FC<SaturnRingsProps> = ({
  planetRadius,
  innerRadiusRatio = 1.25,
  outerRadiusRatio = 2.42,
  ringTexturePath = '/textures/saturn_ring.png',
  ringOpacity = 1.0,
}) => {
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);

  const innerRadius = planetRadius * innerRadiusRatio;
  const outerRadius = planetRadius * outerRadiusRatio;

  const ringTexture = useLoader(THREE.TextureLoader, ringTexturePath);
  ringTexture.colorSpace = THREE.SRGBColorSpace;
  ringTexture.wrapS = THREE.ClampToEdgeWrapping;
  ringTexture.wrapT = THREE.ClampToEdgeWrapping;

  const ringGeometry = useMemo(() => {
    return createPlanetaryRingGeometry(innerRadius, outerRadius, 144);
  }, [innerRadius, outerRadius]);

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRingTexture: { value: ringTexture },
        uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
        uPlanetRadius: { value: planetRadius },
        uRingOpacity: { value: ringOpacity },
      },
      vertexShader: SaturnRingShader.vertexShader,
      fragmentShader: SaturnRingShader.fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
  }, [ringTexture, planetRadius, ringOpacity]);

  // Update solar direction vector relative to Saturn's ring orientation
  useFrame(() => {
    if (ringMeshRef.current && shaderMatRef.current) {
      const saturnWorldPos = new THREE.Vector3();
      ringMeshRef.current.getWorldPosition(saturnWorldPos);

      // Vector pointing toward the Sun at (0, 0, 0) in world coordinates
      const worldSunDir = new THREE.Vector3(0, 0, 0).sub(saturnWorldPos).normalize();

      // Transform world sun direction into Saturn's local ring orientation
      const invSaturnMat = ringMeshRef.current.matrixWorld.clone().invert();
      const localSunDir = worldSunDir.transformDirection(invSaturnMat).normalize();

      shaderMatRef.current.uniforms.uSunDirection.value.copy(localSunDir);
    }
  });

  return (
    // Rings lie in Saturn's equatorial plane
    <mesh
      ref={ringMeshRef}
      geometry={ringGeometry}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <primitive object={ringMaterial} ref={shaderMatRef} attach="material" />
    </mesh>
  );
};
