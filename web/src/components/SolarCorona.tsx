import { useRef, useMemo, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFocusStore } from '../state/useFocusStore';

interface SolarCoronaProps {
  sunRadius?: number;
}

// ---------------------------------------------------------------------------
// 1. Photosphere Shader: Radiant Warm Yellow (NASA's Eyes style)
// ---------------------------------------------------------------------------
const PhotosphereShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColorBase: { value: new THREE.Color('#ffea36') }, // Radiant warm solar yellow
    uColorHot: { value: new THREE.Color('#ffffaa') },  // Superheated luminous center
    uColorLimb: { value: new THREE.Color('#ffd600') }, // Smooth golden solar limb
  },
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorHot;
    uniform vec3 uColorLimb;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    // Fast 3D Simplex noise
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      #include <logdepthbuf_fragment>

      vec3 norm = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      // Subtle convective plasma granulation (delicate, uniform, not lava cracks)
      vec3 p = vPosition * 1.5;
      float t = uTime * 0.06;

      float n1 = snoise(p + vec3(0.0, t * 0.35, 0.0));
      float n2 = snoise(p * 2.4 + vec3(t * 0.15, 0.0, t * 0.25)) * 0.5;
      float granulation = (n1 + n2) * 0.5 + 0.5;

      // Soft, gentle color gradation matching NASA Eyes Sun
      vec3 col = mix(uColorBase, uColorHot, granulation * 0.35);

      // Soft optical limb transition
      float NdotV = clamp(dot(norm, viewDir), 0.0, 1.0);
      float limb = pow(NdotV, 0.3);
      col = mix(uColorLimb, col, 0.82 + 0.18 * limb);

      // Smooth rim glow to blend seamlessly into outer coronal atmosphere
      float rim = pow(1.0 - NdotV, 3.5);
      col += uColorHot * rim * 0.25;

      gl_FragColor = vec4(col * 1.08, 1.0);
    }
  `,
};

// ---------------------------------------------------------------------------
// 2. Coronal Aura Bloom Shader (Soft Radial Gradient Quad facing camera)
// ---------------------------------------------------------------------------
const CoronalBloomShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uGlowColor: { value: new THREE.Color('#ffea36') },
    uOuterColor: { value: new THREE.Color('#ffb700') },
  },
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform float uTime;
    uniform vec3 uGlowColor;
    uniform vec3 uOuterColor;

    varying vec2 vUv;

    void main() {
      #include <logdepthbuf_fragment>

      // UV centered at (0, 0), normalized radius from 0.0 (center) to 1.0 (corners)
      vec2 p = (vUv - vec2(0.5)) * 2.0;
      float dist = length(p);

      if (dist > 1.0) discard;

      // The Sun sphere corresponds to dist = 0.5 in this 4x quad
      float diskR = 0.50;

      float glow;
      if (dist <= diskR) {
        // Inside or at the solar perimeter: intense luminous aura
        glow = 1.0;
      } else {
        // Smooth exponential atmospheric falloff into deep space
        float normDist = (dist - diskR) / (1.0 - diskR);
        glow = exp(-normDist * 3.6) * (1.0 - smoothstep(0.75, 1.0, normDist));
      }

      // Gentle alive breathing pulsation (±1.5%)
      float pulse = 1.0 + sin(uTime * 1.4) * 0.015;
      glow *= pulse;

      // Color transitions from brilliant yellow to warm golden amber at outer rim
      vec3 col = mix(uGlowColor, uOuterColor, smoothstep(0.4, 0.9, dist));

      gl_FragColor = vec4(col * glow * 1.15, glow * 0.92);
    }
  `,
};

export const SolarCorona: FC<SolarCoronaProps> = ({ sunRadius = 4.2 }) => {
  const coronaRef = useRef<THREE.Mesh>(null);
  const photosphereMatRef = useRef<THREE.ShaderMaterial>(null);
  const bloomMatRef = useRef<THREE.ShaderMaterial>(null);

  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);

  // Initialize shader materials
  const photosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PhotosphereShader.uniforms),
      vertexShader: PhotosphereShader.vertexShader,
      fragmentShader: PhotosphereShader.fragmentShader,
      depthWrite: true,
      depthTest: true,
    });
  }, []);

  const bloomMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CoronalBloomShader.uniforms),
      vertexShader: CoronalBloomShader.vertexShader,
      fragmentShader: CoronalBloomShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
  }, []);

  // Update animation time and billboard orientation every frame
  useFrame(({ camera, clock }) => {
    const time = clock.getElapsedTime();

    if (photosphereMatRef.current) {
      photosphereMatRef.current.uniforms.uTime.value = time;
    }

    if (bloomMatRef.current) {
      bloomMatRef.current.uniforms.uTime.value = time;
    }

    if (coronaRef.current) {
      // Always billboard-orient coronal bloom toward the camera
      coronaRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group position={[0, 0, 0]} name="SunRoot">
      {/* 1. Core Solid Photosphere Sphere (Opaque, writes log-depth, occludes stars) */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          selectBody({ id: 'sun', name: 'Sun', radius: sunRadius, type: 'star' });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverBody('sun');
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          hoverBody(null);
        }}
      >
        <sphereGeometry args={[sunRadius, 64, 48]} />
        <primitive object={photosphereMaterial} ref={photosphereMatRef} attach="material" />
      </mesh>

      {/* 2. Radiant Atmospheric Solar Bloom Aura (Additive Camera-Facing Quad) */}
      <mesh ref={coronaRef} position={[0, 0, 0]}>
        <planeGeometry args={[sunRadius * 4.0, sunRadius * 4.0]} />
        <primitive object={bloomMaterial} ref={bloomMatRef} attach="material" />
      </mesh>
    </group>
  );
};
