import { useMemo, useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EarthMoon } from '../moons/EarthMoon';
import { SatelliteSwarm } from '../satellites/SatelliteSwarm';
import { AsteroidFlybySystem } from '../asteroids/AsteroidFlybySystem';
import { useFocusStore } from '../../state/useFocusStore';
import { useSatelliteStore } from '../../state/useSatelliteStore';

interface EarthProps {
  radius?: number;
  position?: [number, number, number];
  axialTiltDeg?: number; // Earth is 23.44°
}

// ---------------------------------------------------------------------------
// 1. Earth Surface GLSL Shader (Day/Night Terminator, Specular Oceans, Rayleigh Limb)
// ---------------------------------------------------------------------------
const EarthSurfaceShader = {
  uniforms: {
    uDayTexture: { value: null as THREE.Texture | null },
    uNightTexture: { value: null as THREE.Texture | null },
    uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
  },
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      // Transform local surface normal into world space
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform vec3 uSunDirection;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
      #include <logdepthbuf_fragment>

      vec3 normal = normalize(vWorldNormal);
      vec3 sunDir = normalize(uSunDirection);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      // 1. Solar incident angle across the sphere in World Space
      float NdotL = dot(normal, sunDir);

      // Smooth twilight transition zone across the terminator (-0.12 to +0.18)
      float dayMix = smoothstep(-0.12, 0.18, NdotL);

      // 2. Sample 2K NASA Blue Marble textures
      vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
      vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

      // Realistic daylight illumination: direct sunlight + ambient starlight fill
      float diffuse = max(NdotL, 0.0);
      vec3 sunlitDay = dayColor * (diffuse * 0.95 + 0.05);

      // Night city lights (NASA Black Marble) fade out naturally on daylit side
      vec3 nightLights = nightColor * (1.0 - dayMix) * 1.6;

      // 3. Specular ocean glint:
      // Oceans have lower red and green reflectance than land in Blue Marble
      float isWater = step(dayColor.r, 0.28) * step(dayColor.g, 0.42);
      vec3 halfVector = normalize(sunDir + viewDir);
      float spec = pow(max(dot(normal, halfVector), 0.0), 32.0) * isWater * max(NdotL, 0.0);
      vec3 oceanSpecular = vec3(0.9, 0.95, 1.0) * spec * 0.75;

      // 4. Photorealistic Atmospheric Rayleigh Limb Scattering
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      float fresnel = pow(rim, 3.2);
      vec3 rayleighBlue = vec3(0.35, 0.65, 1.0);
      vec3 sunsetOrange = vec3(1.0, 0.52, 0.22);
      vec3 atmoColor = mix(sunsetOrange, rayleighBlue, smoothstep(-0.08, 0.30, NdotL));
      vec3 atmosphereLimb = atmoColor * fresnel * smoothstep(-0.20, 0.35, NdotL) * 0.70;

      vec3 finalColor = mix(nightLights, sunlitDay + oceanSpecular, dayMix) + atmosphereLimb;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export const Earth: FC<EarthProps> = ({
  radius = 2.0,
  position = [0, 0, 0],
  axialTiltDeg = 23.44,
}) => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const surfaceMatRef = useRef<THREE.ShaderMaterial>(null);

  const selectBody = useFocusStore((state) => state.selectBody);
  const hoverBody = useFocusStore((state) => state.hoverBody);
  const showSatellites = useSatelliteStore((state) => state.showSatellites);

  // Load authentic 2K NASA Blue Marble textures
  const [dayTexture, nightTexture, cloudsTexture] = useLoader(THREE.TextureLoader, [
    '/textures/earth.png',
    '/textures/earth_night.png',
    '/textures/earth_clouds.png',
  ]);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  cloudsTexture.colorSpace = THREE.SRGBColorSpace;

  // Custom surface shader with log-depth support
  const surfaceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: dayTexture },
        uNightTexture: { value: nightTexture },
        uSunDirection: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: EarthSurfaceShader.vertexShader,
      fragmentShader: EarthSurfaceShader.fragmentShader,
      depthWrite: true,
      depthTest: true,
    });
  }, [dayTexture, nightTexture]);

  // Update solar incident direction and advance planetary rotation
  useFrame((_, delta) => {
    if (!earthGroupRef.current) return;

    // Earth's position in world space
    const earthPos = new THREE.Vector3();
    earthGroupRef.current.getWorldPosition(earthPos);

    // Vector pointing from Earth directly to Sun at (0, 0, 0)
    const sunDir = new THREE.Vector3(0, 0, 0).sub(earthPos).normalize();

    if (surfaceMatRef.current) {
      surfaceMatRef.current.uniforms.uSunDirection.value.copy(sunDir);
    }

    // Sidereal daily rotation (~24 hours)
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y += delta * 0.15;
    }

    // Clouds drift slightly faster (~atmospheric weather winds)
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.175;
    }
  });

  const tiltRad = (axialTiltDeg * Math.PI) / 180.0;

  return (
    <group ref={earthGroupRef} position={position}>
      {/* 1. Obliquity Tilt Group (23.44°) */}
      <group rotation={[tiltRad, 0, 0]}>
        {/* 2. Sidereal Rotation Group */}
        <group ref={spinGroupRef}>
          {/* Earth Solid Globe (Opaque, writes log-depth, occludes stars) */}
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              selectBody({ id: 'earth', name: 'Earth', radius, type: 'planet' });
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              hoverBody('earth');
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
              hoverBody(null);
            }}
          >
            <sphereGeometry args={[radius, 64, 48]} />
            <primitive object={surfaceMaterial} ref={surfaceMatRef} attach="material" />
          </mesh>

          {/* Earth Dynamic Atmospheric Cloud Layer (Radius * 1.008) */}
          <mesh ref={cloudsRef}>
            <sphereGeometry args={[radius * 1.008, 64, 48]} />
            <meshStandardMaterial
              map={cloudsTexture}
              transparent
              opacity={0.88}
              roughness={0.95}
              metalness={0.0}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* 3. Earth Spacecraft & Satellite Swarm (ISS, Hubble, Tiangong, Landsat) */}
        <SatelliteSwarm earthRadius={radius} visible={showSatellites} />
      </group>

      {/* 4. Earth's Moon (High-Precision Ephemeris, Tidally Locked) */}
      <EarthMoon earthRadius={radius} />

      {/* 5. Near-Earth Asteroid Flybys (Apophis, 2024 MK, 2023 DZ2) */}
      <AsteroidFlybySystem earthRadius={radius} />
    </group>
  );
};
