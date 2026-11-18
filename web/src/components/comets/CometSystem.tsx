import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  COMET_CATALOG,
  getCometHeliocentricPosition,
  generateCometOrbitPoints,
  type CometMetadata,
} from '../../science/cometCatalog';
import type { CoordinateProjector } from '../../science/transforms';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { useCometStore } from '../../state/useCometStore';

// ---------------------------------------------------------------------------
// 1. Dual Comet Tail GLSL Shaders (Ion & Dust Tails)
// ---------------------------------------------------------------------------

const IonTailShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      // vUv.x: 0.0 to 1.0 across width, vUv.y: 0.0 at nucleus to 1.0 at tail tip
      float distFromCenter = abs(vUv.x - 0.5) * 2.0;
      float beam = exp(-3.8 * distFromCenter * distFromCenter);
      float falloff = pow(1.0 - vUv.y, 1.25);
      float stream = 0.92 + 0.08 * sin(vUv.y * 28.0 - uTime * 6.0);

      float alpha = beam * falloff * stream * uOpacity;
      if (alpha < 0.005) discard;

      // Hot white-cyan central core fading out to electric blue
      vec3 coreColor = mix(uColor, vec3(0.9, 0.98, 1.0), pow(beam, 2.5) * (1.0 - vUv.y));
      gl_FragColor = vec4(coreColor, alpha);
    }
  `,
};

const DustTailShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      // Broad curved diffuse dust fan
      float distFromCenter = abs(vUv.x - 0.5) * 2.0;
      float fan = exp(-2.2 * distFromCenter * distFromCenter);
      float falloff = pow(1.0 - vUv.y, 1.55);

      float alpha = fan * falloff * uOpacity * 0.75;
      if (alpha < 0.005) discard;

      gl_FragColor = vec4(uColor, alpha);
    }
  `,
};

// ---------------------------------------------------------------------------
// 2. Single Comet Entity (Nucleus, Coma, Dual Tail & Orbital Propagation)
// ---------------------------------------------------------------------------

interface CometEntityProps {
  comet: CometMetadata;
  projector: CoordinateProjector;
}

const CometEntity: FC<CometEntityProps> = ({ comet, projector }) => {
  const currentJde = useSimulationClock((state) => state.currentJde);
  const selectBody = useFocusStore((state) => state.selectBody);
  const selectedId = useFocusStore((state) => state.selectedId);

  const groupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const ionTailMeshRef = useRef<THREE.Mesh>(null);
  const dustTailMeshRef = useRef<THREE.Mesh>(null);
  const comaMeshRef = useRef<THREE.Mesh>(null);

  const isSelected = selectedId === comet.id;

  // High-res comet nucleus texture (dark, cratered icy rock)
  const nucleusTexture = useTexture('/textures/comet_nucleus.jpg');

  // Custom tail shader materials
  const ionTailMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(comet.tailColorIon) },
        uOpacity: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: IonTailShader.vertexShader,
      fragmentShader: IonTailShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [comet.tailColorIon]);

  const dustTailMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(comet.tailColorDust) },
        uOpacity: { value: 0.0 },
      },
      vertexShader: DustTailShader.vertexShader,
      fragmentShader: DustTailShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [comet.tailColorDust]);

  // Plane geometries for tails (tapered strip mesh oriented along +Y in local space)
  const tailGeometry = useMemo(() => {
    // 2D strip spanning [-0.5, 0.5] in X, [0, 1] in Y
    const geom = new THREE.PlaneGeometry(1.0, 1.0, 1, 1);
    // Shift origin so (0,0) is at the nucleus tip
    geom.translate(0, 0.5, 0);
    return geom;
  }, []);

  // Compute 3D position and orient dual tails every frame
  useFrame((state) => {
    const cometState = getCometHeliocentricPosition(comet, currentJde);
    const [sceneX, sceneY, sceneZ] = projector.projectPosition(cometState.position);

    if (groupRef.current) {
      groupRef.current.position.set(sceneX, sceneY, sceneZ);
    }

    // Solar sublimation activity factor (proportional to 1/r^2 when inside 3.5 AU)
    const r = cometState.distanceAu;
    const activity = r < 4.0 ? Math.min(4.0, Math.max(0.0, Math.pow(2.4 / r, 1.8) - 0.2)) : 0.0;

    // Modulate coma size and glow
    if (comaMeshRef.current) {
      const comaScale = Math.max(0.2, 0.4 + activity * 0.45);
      comaMeshRef.current.scale.set(comaScale, comaScale, comaScale);
      (comaMeshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, 0.25 + activity * 0.35);
    }

    // 1. Blue Ion Tail: Points straight anti-solar (away from Sun)
    // In scene coordinates, Sun is at (0,0,0), so anti-solar is direction from Sun to Comet
    const antiSolarVec = new THREE.Vector3(sceneX, sceneY, sceneZ).normalize();
    const ionTailLength = Math.min(38.0, 5.0 + activity * 9.5);
    const ionTailWidth = Math.max(0.35, 0.6 + activity * 0.6);

    if (ionTailMeshRef.current && activity > 0.05) {
      ionTailMeshRef.current.visible = true;
      ionTailMeshRef.current.scale.set(ionTailWidth, ionTailLength, 1.0);
      // Orient +Y of plane towards antiSolarVec
      ionTailMeshRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), antiSolarVec);
      ionTailMaterial.uniforms.uOpacity.value = Math.min(0.85, activity * 0.55);
      ionTailMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    } else if (ionTailMeshRef.current) {
      ionTailMeshRef.current.visible = false;
    }

    // 2. White Dust Tail: Sweeps back curved along combination of anti-solar and negative velocity
    const [vxScene, vyScene, vzScene] = projector.projectPosition({
      x: cometState.velocity.x,
      y: cometState.velocity.y,
      z: cometState.velocity.z,
    });
    const velVec = new THREE.Vector3(vxScene, vyScene, vzScene).normalize();

    // Dust tail vector curves towards -velVec
    const dustTailVec = new THREE.Vector3()
      .addScaledVector(antiSolarVec, 0.72)
      .addScaledVector(velVec, -0.45)
      .normalize();

    const dustTailLength = Math.min(28.0, 3.5 + activity * 7.5);
    const dustTailWidth = Math.max(0.6, 1.2 + activity * 1.4);

    if (dustTailMeshRef.current && activity > 0.05) {
      dustTailMeshRef.current.visible = true;
      dustTailMeshRef.current.scale.set(dustTailWidth, dustTailLength, 1.0);
      dustTailMeshRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dustTailVec);
      dustTailMaterial.uniforms.uOpacity.value = Math.min(0.70, activity * 0.45);
    } else if (dustTailMeshRef.current) {
      dustTailMeshRef.current.visible = false;
    }

    // Slow nucleus tumble on irregular axes (like real comets)
    if (nucleusRef.current) {
      nucleusRef.current.rotation.x += 0.004;
      nucleusRef.current.rotation.y += 0.007;
    }
  });

  return (
    <group
      ref={groupRef}
      name={comet.id}
      onClick={(e) => {
        e.stopPropagation();
        selectBody({
          id: comet.id,
          name: comet.name,
          radius: 0.6,
          type: 'comet',
        });
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 1. Icy Nucleus — high-res textured irregular body, like ESA Rosetta imagery */}
      <mesh ref={nucleusRef} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.22, 1]} />
        <meshStandardMaterial
          map={nucleusTexture}
          color="#888888"
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* 2. Glowing Coma Halo */}
      <mesh ref={comaMeshRef}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshBasicMaterial
          color={comet.tailColorIon}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Blue Ion Tail (Straight, Anti-Solar) */}
      <mesh
        ref={ionTailMeshRef}
        geometry={tailGeometry}
        material={ionTailMaterial}
        renderOrder={-50}
      />

      {/* 4. White / Amber Dust Tail (Curving along orbital velocity) */}
      <mesh
        ref={dustTailMeshRef}
        geometry={tailGeometry}
        material={dustTailMaterial}
        renderOrder={-51}
      />

      {/* 5. Minimalist 3D Screen Label */}
      <Html
        position={[0, 0.9, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            selectBody({
              id: comet.id,
              name: comet.name,
              radius: 0.6,
              type: 'comet',
            });
          }}
          style={{
            pointerEvents: 'auto',
            background: isSelected ? 'rgba(15, 23, 42, 0.94)' : 'rgba(8, 14, 28, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1.5px solid ${comet.colorHex}${isSelected ? 'ff' : '66'}`,
            borderRadius: '9999px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: isSelected ? `0 0 14px ${comet.colorHex}88` : '0 2px 6px rgba(0,0,0,0.5)',
            transform: isSelected ? 'scale(1.08)' : 'scale(1.0)',
            transition: 'all 0.16s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '11px' }}>☄️</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#f8fafc',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {comet.shortName}
          </span>
        </div>
      </Html>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3. Comet Orbit Line Path
// ---------------------------------------------------------------------------

const CometOrbitTrack: FC<{ comet: CometMetadata; projector: CoordinateProjector }> = ({
  comet,
  projector,
}) => {
  const lineGeometry = useMemo(() => {
    const rawPoints = generateCometOrbitPoints(comet, 240);
    const scenePoints: THREE.Vector3[] = rawPoints.map((pt) => {
      const [x, y, z] = projector.projectPosition(pt);
      return new THREE.Vector3(x, y, z);
    });
    return new THREE.BufferGeometry().setFromPoints(scenePoints);
  }, [comet, projector]);

  return (
    <primitive object={new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: comet.colorHex,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )} />
  );
};

// ---------------------------------------------------------------------------
// 4. CometSystem Master Component
// ---------------------------------------------------------------------------

export const CometSystem: FC<{ projector: CoordinateProjector }> = ({ projector }) => {
  const showComets = useCometStore((state) => state.showComets);

  const cometsList = useMemo(() => Object.values(COMET_CATALOG), []);

  if (!showComets) return null;

  return (
    <group name="CometSystem">
      {/* Closed Orbital Tracks */}
      {cometsList.map((c) => (
        <CometOrbitTrack key={`comet-orbit-${c.id}`} comet={c} projector={projector} />
      ))}

      {/* Propagating Comet Entities with Dual Tails */}
      {cometsList.map((c) => (
        <CometEntity key={`comet-entity-${c.id}`} comet={c} projector={projector} />
      ))}
    </group>
  );
};
