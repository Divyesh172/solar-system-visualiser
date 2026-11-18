import { useMemo, useState, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGroundObserverStore } from '../../state/useGroundObserverStore';
import { useSimulationClock } from '../../science/useSimulationClock';
import { jdeToDate } from '../../science/time';
import {
  getSkyAtmosphereState,
  getLocalPlanets,
  getLocalSun,
  getLocalMoon,
  type LocalCelestialBody,
  type SkyAtmosphereState,
} from '../../science/topocentricCoordinates';

const DOME_RADIUS = 85.0;

/**
 * 3D Compass Ring & Cardinal Direction Ticks
 */
function useCompassGeometry() {
  return useMemo(() => {
    const points: number[] = [];
    const radiusOuter = 48.0;

    // 1. Concentric circular ring boundary
    const segments = 120;
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      // x = r * sin(az), z = -r * cos(az)
      points.push(
        radiusOuter * Math.sin(theta1), 0.05, -radiusOuter * Math.cos(theta1),
        radiusOuter * Math.sin(theta2), 0.05, -radiusOuter * Math.cos(theta2)
      );
    }

    // 2. Degree Tick marks around the dial
    for (let deg = 0; deg < 360; deg += 5) {
      const isCardinal = deg % 90 === 0;
      const isMajor = deg % 30 === 0;
      const isMinor = deg % 10 === 0;

      const innerR = isCardinal
        ? radiusOuter - 3.8
        : isMajor
        ? radiusOuter - 2.5
        : isMinor
        ? radiusOuter - 1.5
        : radiusOuter - 0.8;

      const rad = (deg * Math.PI) / 180;
      const sinA = Math.sin(rad);
      const cosA = Math.cos(rad);

      points.push(
        innerR * sinA, 0.05, -innerR * cosA,
        radiusOuter * sinA, 0.05, -radiusOuter * cosA
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);
}

/**
 * Alt/Az Coordinate Grid Lines (Stellarium / Planetarium Dome Grid)
 */
function useAltAzGridGeometry() {
  return useMemo(() => {
    const points: number[] = [];
    const r = DOME_RADIUS;

    // 1. Altitude parallel circles at 15°, 30°, 45°, 60°, 75°
    const altLevels = [15, 30, 45, 60, 75];
    const segs = 90;
    for (const alt of altLevels) {
      const altRad = (alt * Math.PI) / 180;
      const y = r * Math.sin(altRad);
      const rLevel = r * Math.cos(altRad);

      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          rLevel * Math.sin(a1), y, -rLevel * Math.cos(a1),
          rLevel * Math.sin(a2), y, -rLevel * Math.cos(a2)
        );
      }
    }

    // 2. Azimuth meridian arcs every 30° from horizon to zenith
    for (let az = 0; az < 360; az += 30) {
      const azRad = (az * Math.PI) / 180;
      const sinAz = Math.sin(azRad);
      const cosAz = Math.cos(azRad);
      const arcSteps = 30;

      for (let s = 0; s < arcSteps; s++) {
        const alt1 = (s / arcSteps) * 90 * (Math.PI / 180);
        const alt2 = ((s + 1) / arcSteps) * 90 * (Math.PI / 180);

        const y1 = r * Math.sin(alt1);
        const rH1 = r * Math.cos(alt1);
        const y2 = r * Math.sin(alt2);
        const rH2 = r * Math.cos(alt2);

        points.push(
          rH1 * sinAz, y1, -rH1 * cosAz,
          rH2 * sinAz, y2, -rH2 * cosAz
        );
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);
}

export const GroundSkyDome: FC = () => {
  const viewMode = useGroundObserverStore((state) => state.viewMode);
  const location = useGroundObserverStore((state) => state.location);
  const showCompassRing = useGroundObserverStore((state) => state.showCompassRing);
  const showCardinalLabels = useGroundObserverStore((state) => state.showCardinalLabels);
  const showPlanetMarkers = useGroundObserverStore((state) => state.showPlanetMarkers);
  const showAltAzGrid = useGroundObserverStore((state) => state.showAltAzGrid);

  const compassGeometry = useCompassGeometry();
  const altAzGridGeometry = useAltAzGridGeometry();

  const [hoveredBody, setHoveredBody] = useState<LocalCelestialBody | null>(null);

  // Dynamic state updated every simulation tick
  const [atmosphere, setAtmosphere] = useState<SkyAtmosphereState | null>(null);
  const [planets, setPlanets] = useState<LocalCelestialBody[]>([]);
  const [sun, setSun] = useState<LocalCelestialBody | null>(null);
  const [moon, setMoon] = useState<LocalCelestialBody | null>(null);

  useFrame(() => {
    if (viewMode !== 'ground') return;

    const currentJde = useSimulationClock.getState().currentJde;
    const simDate = jdeToDate(currentJde);

    const atmos = getSkyAtmosphereState(simDate, location);
    setAtmosphere(atmos);

    const pl = getLocalPlanets(simDate, location, DOME_RADIUS);
    setPlanets(pl);

    const s = getLocalSun(simDate, location, DOME_RADIUS);
    setSun(s);

    const m = getLocalMoon(simDate, location, DOME_RADIUS);
    setMoon(m);
  });

  if (viewMode !== 'ground') {
    return null;
  }

  // Sky dome shader material blending zenith to horizon
  const zenithColor = atmosphere?.zenithColor || '#020617';
  const horizonColor = atmosphere?.horizonColor || '#0f172a';
  const groundColor = atmosphere?.groundColor || '#090d16';
  const starsOpacity = atmosphere?.starsOpacity ?? 1.0;

  return (
    <group name="GroundSkyDomeSystem" position={[0, 0, 0]}>
      {/* 1. Ground Observer Floor Platform / Horizon Dish (Y = 0) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[60.0, 64]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Outer ground terrain fade ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <ringGeometry args={[60.0, 95.0, 64]} />
        <meshBasicMaterial
          color="#020408"
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* 2. 3D Compass Cardinal Ring & Ticks */}
      {showCompassRing && (
        <lineSegments geometry={compassGeometry}>
          <lineBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 3. Floating Cardinal Direction Markers (N, E, S, W, etc.) */}
      {showCardinalLabels && (
        <>
          {/* North (0° / 360°) */}
          <Html position={[0, 0.4, -48]} center distanceFactor={24}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.22)',
                border: '1.5px solid #ef4444',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.45)',
                userSelect: 'none',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              ⭐ N (0°)
            </div>
          </Html>

          {/* East (90°) */}
          <Html position={[48, 0.4, 0]} center distanceFactor={24}>
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.22)',
                border: '1.5px solid #38bdf8',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.45)',
                userSelect: 'none',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              🌅 E (90°)
            </div>
          </Html>

          {/* South (180°) */}
          <Html position={[0, 0.4, 48]} center distanceFactor={24}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.22)',
                border: '1.5px solid #f59e0b',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.45)',
                userSelect: 'none',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              S (180°)
            </div>
          </Html>

          {/* West (270°) */}
          <Html position={[-48, 0.4, 0]} center distanceFactor={24}>
            <div
              style={{
                background: 'rgba(234, 88, 12, 0.22)',
                border: '1.5px solid #ea580c',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                boxShadow: '0 0 12px rgba(234, 88, 12, 0.45)',
                userSelect: 'none',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              🌇 W (270°)
            </div>
          </Html>

          {/* Intermediate Cardinal Bearings */}
          <Html position={[33.9, 0.3, -33.9]} center distanceFactor={26}>
            <div style={{ color: 'rgba(148, 163, 184, 0.85)', fontSize: '10px', fontWeight: 600 }}>NE</div>
          </Html>
          <Html position={[33.9, 0.3, 33.9]} center distanceFactor={26}>
            <div style={{ color: 'rgba(148, 163, 184, 0.85)', fontSize: '10px', fontWeight: 600 }}>SE</div>
          </Html>
          <Html position={[-33.9, 0.3, 33.9]} center distanceFactor={26}>
            <div style={{ color: 'rgba(148, 163, 184, 0.85)', fontSize: '10px', fontWeight: 600 }}>SW</div>
          </Html>
          <Html position={[-33.9, 0.3, -33.9]} center distanceFactor={26}>
            <div style={{ color: 'rgba(148, 163, 184, 0.85)', fontSize: '10px', fontWeight: 600 }}>NW</div>
          </Html>
        </>
      )}

      {/* 4. Alt/Az Coordinate Planetarium Dome Grid Lines */}
      {showAltAzGrid && (
        <lineSegments geometry={altAzGridGeometry}>
          <lineBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 5. Dynamic Sky Atmosphere Dome (Blends Daylight into Night Starfield) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[DOME_RADIUS + 2.0, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color={starsOpacity < 0.3 ? zenithColor : horizonColor}
          side={THREE.BackSide}
          transparent
          opacity={Math.max(0.04, 1.0 - starsOpacity * 0.96)}
          depthWrite={false}
        />
      </mesh>

      {/* 6. Real-time Topocentric Celestial Bodies (Sun, Moon, Planets) */}
      {/* ☀️ Local Sun */}
      {sun && sun.isAboveHorizon && (
        <group position={sun.cartesian}>
          {/* Glowing Sun Core */}
          <mesh>
            <sphereGeometry args={[2.8, 24, 24]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          {/* Coronal Flare Halo */}
          <mesh>
            <sphereGeometry args={[4.8, 24, 24]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.35}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Sun Label */}
          {showPlanetMarkers && (
            <Html center distanceFactor={28}>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '4px 8px',
                  color: '#fef08a',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                }}
              >
                ☀️ Sun • {sun.altitudeDeg}° {sun.compassDirection}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* 🌕 Local Moon */}
      {moon && moon.isAboveHorizon && (
        <group position={moon.cartesian}>
          <mesh>
            <sphereGeometry args={[1.6, 24, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          <mesh>
            <sphereGeometry args={[2.5, 24, 24]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Moon Label */}
          {showPlanetMarkers && (
            <Html center distanceFactor={28}>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid #38bdf8',
                  borderRadius: '10px',
                  padding: '4px 8px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)',
                }}
              >
                🌕 Moon • {moon.altitudeDeg}° {moon.compassDirection}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* 🪐 Local Visible Planets (Venus, Mars, Jupiter, Saturn, Mercury) */}
      {showPlanetMarkers &&
        planets.map((planet) => {
          if (!planet.isAboveHorizon) return null;

          const isHovered = hoveredBody?.id === planet.id;

          return (
            <group key={planet.id} position={planet.cartesian}>
              {/* Planet Pinpoint Sphere */}
              <mesh
                onPointerOver={() => setHoveredBody(planet)}
                onPointerOut={() => setHoveredBody(null)}
              >
                <sphereGeometry args={[isHovered ? 1.4 : 0.9, 16, 16]} />
                <meshBasicMaterial color={planet.colorHex} />
              </mesh>

              {/* Radiant Beacon Aura */}
              <mesh>
                <sphereGeometry args={[isHovered ? 2.5 : 1.8, 16, 16]} />
                <meshBasicMaterial
                  color={planet.colorHex}
                  transparent
                  opacity={0.3}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>

              {/* Interactive Planet Floating Badge */}
              <Html center distanceFactor={28}>
                <div
                  onMouseEnter={() => setHoveredBody(planet)}
                  onMouseLeave={() => setHoveredBody(null)}
                  style={{
                    background: 'rgba(10, 16, 32, 0.88)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1.5px solid ${planet.colorHex}`,
                    borderRadius: '10px',
                    padding: '4px 9px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: `0 4px 16px rgba(0, 0, 0, 0.7), 0 0 10px ${planet.colorHex}44`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transform: isHovered ? 'scale(1.08)' : 'scale(1.0)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '13px' }}>{planet.emoji}</span>
                    <span style={{ color: planet.colorHex }}>{planet.name}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      ({planet.altitudeDeg}° {planet.compassDirection})
                    </span>
                  </div>

                  {isHovered && (
                    <div
                      style={{
                        fontSize: '9.5px',
                        color: '#cbd5e1',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingTop: '3px',
                        marginTop: '2px',
                        maxWidth: '180px',
                        whiteSpace: 'normal',
                        lineHeight: 1.3,
                      }}
                    >
                      {planet.viewingTip}
                    </div>
                  )}
                </div>
              </Html>
            </group>
          );
        })}
    </group>
  );
};
