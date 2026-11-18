import { useState, type FC } from 'react';
import {
  Sunrise,
  Sunset,
  Sun,
  ChevronDown,
  ChevronUp,
  X,
  Rocket,
  Compass,
} from 'lucide-react';
import { useGroundObserverStore } from '../../state/useGroundObserverStore';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useIsMobile } from '../../utils/useMediaQuery';
import { jdeToDate } from '../../science/time';
import {
  PRESET_LOCATIONS,
  getSkyAtmosphereState,
  getLocalSunTimes,
  getLocalPlanets,
  getLocalMoon,
  getLocalSun,
  type LocalCelestialBody,
} from '../../science/topocentricCoordinates';

function formatTime(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const LocalSkyCard: FC = () => {
  const viewMode = useGroundObserverStore((state) => state.viewMode);
  const location = useGroundObserverStore((state) => state.location);
  const setLocation = useGroundObserverStore((state) => state.setLocation);
  const toggleViewMode = useGroundObserverStore((state) => state.toggleViewMode);
  const isMobile = useIsMobile();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const currentJde = useSimulationClock((state) => state.currentJde);
  const simDate = jdeToDate(currentJde);

  // Only render when in "Stand on Earth" Ground Mode
  if (viewMode !== 'ground') {
    return null;
  }

  const atmosphere = getSkyAtmosphereState(simDate, location);
  const sunTimes = getLocalSunTimes(simDate, location);
  const planets = getLocalPlanets(simDate, location);
  const moon = getLocalMoon(simDate, location);
  const sun = getLocalSun(simDate, location);

  // Collect visible bodies
  const visiblePlanets = planets.filter((p) => p.isAboveHorizon);
  const visibleBodies: LocalCelestialBody[] = [];
  if (sun.isAboveHorizon) visibleBodies.push(sun);
  if (moon.isAboveHorizon) visibleBodies.push(moon);
  visibleBodies.push(...visiblePlanets);

  // Phase badge color
  const phaseColors: Record<string, string> = {
    day: '#38bdf8',
    golden_hour: '#f59e0b',
    sunset_dusk: '#ea580c',
    civil_twilight: '#c026d3',
    nautical_twilight: '#818cf8',
    astronomical_twilight: '#6366f1',
    night: '#38bdf8',
  };
  const phaseColor = phaseColors[atmosphere.phase] || '#38bdf8';

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? '64px' : '20px',
        right: isMobile ? '10px' : '20px',
        zIndex: 42,
        width: isMobile ? 'calc(100vw - 20px)' : '320px',
        maxHeight: isMobile ? 'calc(100vh - 180px)' : '80vh',
        overflowY: 'auto',
        background: 'rgba(10, 16, 32, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(74, 222, 128, 0.4)',
        borderRadius: '18px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(74, 222, 128, 0.15)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideInTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          onClick={() => setShowCityPicker((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
          }}
          title="Click to change observer city"
        >
          <span style={{ fontSize: '18px' }}>{location.flagEmoji}</span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {location.name}
              <ChevronDown size={13} color="#94a3b8" />
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {location.latitude >= 0 ? `${location.latitude.toFixed(1)}°N` : `${Math.abs(location.latitude).toFixed(1)}°S`},{' '}
              {location.longitude >= 0 ? `${location.longitude.toFixed(1)}°E` : `${Math.abs(location.longitude).toFixed(1)}°W`}
            </div>
          </div>
        </div>

        {/* Phase Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: `${phaseColor}20`,
            border: `1px solid ${phaseColor}55`,
            borderRadius: '9999px',
            padding: '3px 8px',
            fontSize: '10.5px',
            fontWeight: 700,
            color: phaseColor,
            whiteSpace: 'nowrap',
          }}
        >
          {atmosphere.phaseLabel}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand observer sheet' : 'Collapse observer sheet'}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          <button
            onClick={toggleViewMode}
            title="Return to Space Orbit"
            style={{
              background: 'rgba(56, 189, 248, 0.18)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. City Picker Dropdown (Expandable) */}
      {showCityPicker && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5px',
          }}
        >
          {PRESET_LOCATIONS.map((preset) => {
            const isSelected = location.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setLocation(preset);
                  setShowCityPicker(false);
                }}
                style={{
                  background: isSelected ? 'rgba(74, 222, 128, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  color: isSelected ? '#4ade80' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{preset.flagEmoji}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Main Card Content (Collapsible) */}
      {!isCollapsed && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Sun Times Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Sunrise size={11} color="#f59e0b" /> Sunrise
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {formatTime(sunTimes.sunrise)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Sun size={11} color="#fef08a" /> Solar Noon
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {formatTime(sunTimes.solarNoon)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Sunset size={11} color="#ea580c" /> Sunset
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {formatTime(sunTimes.sunset)}
              </div>
            </div>
          </div>

          {/* Sun Altitude & Azimuth Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} color="#38bdf8" /> Solar Elevation:
            </span>
            <span style={{ fontWeight: 700, color: atmosphere.sunAltitudeDeg > 0 ? '#fef08a' : '#94a3b8' }}>
              {atmosphere.sunAltitudeDeg.toFixed(1)}° ({atmosphere.sunAltitudeDeg > 0 ? 'Above horizon' : 'Below horizon'})
            </span>
          </div>

          {/* Visible Celestial Bodies Tonight */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#38bdf8',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Tonight's Sky: Visible Worlds</span>
              <span
                style={{
                  fontSize: '9.5px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                }}
              >
                {visibleBodies.length} in sky
              </span>
            </div>

            {visibleBodies.length === 0 ? (
              <div
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '10px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                No naked-eye planets are currently above the horizon. Scrub the clock forward to evening twilight!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {visibleBodies.map((body) => (
                  <div
                    key={body.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${body.colorHex}33`,
                      borderRadius: '10px',
                      padding: '7px 9px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>{body.emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                          {body.name}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', fontWeight: 600, color: body.colorHex }}>
                        {body.altitudeDeg}° {body.compassDirection}
                      </div>
                    </div>

                    <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: 1.35 }}>
                      {body.viewingTip}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Return to Orbit Action */}
          <button
            onClick={toggleViewMode}
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Rocket size={13} color="#38bdf8" /> Return to Space Orbit
          </button>
        </div>
      )}
    </div>
  );
};
