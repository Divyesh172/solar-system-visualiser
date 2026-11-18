import { useState, useEffect, type FC } from 'react';
import { Volume2, X, Sparkles, Thermometer, Orbit, Clock, Globe, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { useFocusStore } from '../../state/useFocusStore';
import { useTourStore } from '../../state/useTourStore';
import { useTutorialStore } from '../../state/useTutorialStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { PLANETARY_METADATA } from '../../science/constants';
import { captureSnapshot } from '../../utils/captureSnapshot';
import { useSimulationClock } from '../../science/useSimulationClock';
import { getLunarPhaseInfo, getLunarEphemeris } from '../../science/astroEngineAdapter';
import { SATELLITE_CATALOG } from '../../science/satelliteCatalog';
import { propagateSatellite } from '../../science/satellitePropagator';
import { COMET_CATALOG, getCometHeliocentricPosition, type CometId } from '../../science/cometCatalog';
import { useAsteroidStore } from '../../state/useAsteroidStore';
import { jdeToDate } from '../../science/time';
import type { PlanetKey } from '../../science/ephemeris';

export const FactCard: FC = () => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const clearSelection = useFocusStore((state) => state.clearSelection);
  const isTourOpen = useTourStore((state) => state.isOpen);
  const isTutorialOpen = useTutorialStore((state) => state.isOpen);
  const isMobile = useIsMobile();

  const [factIndex, setFactIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset to first fact and collapse drawer whenever selected celestial body changes
  useEffect(() => {
    setFactIndex(0);
    setIsExpanded(false);
  }, [selectedId]);

  const isSatellite = !!selectedId && selectedId in SATELLITE_CATALOG;
  const satMeta = isSatellite ? SATELLITE_CATALOG[selectedId] : null;
  const isComet = !!selectedId && selectedId in COMET_CATALOG;
  const cometMeta = isComet ? COMET_CATALOG[selectedId as CometId] : null;
  const asteroids = useAsteroidStore((state) => state.asteroids);
  const asteroidMeta = asteroids.find((a) => a.id === selectedId) || null;
  const isAsteroid = !!asteroidMeta;
  const isPlanetOrMoon = !!selectedId && selectedId in PLANETARY_METADATA;

  // ── ALL hooks must come before any conditional return ──────────────────────
  // useSimulationClock is a hook; calling it after an early `return null` would
  // violate the Rules of Hooks and crash React (changing hook count per render).
  const currentJde = useSimulationClock((state) => state.currentJde);

  // Hide FactCard if no recognized body selected, or during guided tour / tutorial to avoid collisions
  if (!selectedId || (!isPlanetOrMoon && !isSatellite && !isComet && !isAsteroid) || isTourOpen || isTutorialOpen) {
    return null;
  }

  const meta = isPlanetOrMoon ? PLANETARY_METADATA[selectedId as PlanetKey] : null;
  const satTelemetry = isSatellite && satMeta ? propagateSatellite(satMeta, jdeToDate(currentJde), 2.0) : null;
  const cometState = isComet && cometMeta ? getCometHeliocentricPosition(cometMeta, currentJde) : null;

  const displayName = isSatellite
    ? satMeta!.name
    : isComet
    ? cometMeta!.name
    : isAsteroid
    ? asteroidMeta!.name
    : meta!.name;
  const displayColor = isSatellite
    ? satMeta!.colorHex
    : isComet
    ? cometMeta!.colorHex
    : isAsteroid
    ? (asteroidMeta!.isPotentiallyHazardous ? '#f59e0b' : '#38bdf8')
    : meta!.colorHex;
  const displayEmoji = isSatellite
    ? satMeta!.iconEmoji
    : isComet
    ? cometMeta!.iconEmoji
    : isAsteroid
    ? '🪨'
    : null;

  const lunarPhase = selectedId === 'moon' ? getLunarPhaseInfo(currentJde) : null;
  const lunarEphem = selectedId === 'moon' ? getLunarEphemeris(currentJde) : null;

  const rawFacts = isSatellite
    ? satMeta!.funFacts
    : isComet
    ? cometMeta!.funFacts
    : isAsteroid
    ? [
        asteroidMeta!.funFact ||
          `Asteroid ${asteroidMeta!.name} passes Earth at a miss distance of ${asteroidMeta!.missDistanceLunar.toFixed(2)} Lunar Distances (${asteroidMeta!.missDistanceKm.toLocaleString()} km).`,
        `Estimated diameter is between ${asteroidMeta!.diameterMeters.min} and ${asteroidMeta!.diameterMeters.max} meters, moving at a relative speed of ${asteroidMeta!.relativeVelocityKmS} km/s.`,
        asteroidMeta!.isPotentiallyHazardous
          ? 'Classified as a Potentially Hazardous Asteroid (PHA) due to its size (>140m) and proximity to Earth’s orbit.'
          : 'Safe planetary flyby passing through the Earth-Moon system.',
      ]
    : meta!.funFacts && meta!.funFacts.length > 0
    ? meta!.funFacts
    : [meta!.funFact];
  const facts = rawFacts && rawFacts.length > 0 ? rawFacts : ['In orbit exploring our Solar System!'];
  const currentFactIndex = Math.min(Math.max(0, factIndex), facts.length - 1);

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(displayName);
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePrevFact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFactIndex((prev) => (prev > 0 ? prev - 1 : facts.length - 1));
  };

  const handleNextFact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFactIndex((prev) => (prev < facts.length - 1 ? prev + 1 : 0));
  };

  // =========================================================================
  // 1. MOBILE COLLAPSED PEEK PILL (Allows 100% full view of the planet!)
  // =========================================================================
  if (isMobile && !isExpanded) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '12px',
          right: '12px',
          zIndex: 60,
          background: 'rgba(10, 16, 30, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${displayColor}55`,
          borderRadius: '24px',
          padding: '10px 14px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.7), 0 0 25px ${displayColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'slideUpBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Left: Indicator + Name + Distance/Temp Preview */}
        <div
          onClick={() => setIsExpanded(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
        >
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: displayColor,
              boxShadow: `0 0 10px ${displayColor}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>{displayName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak();
                }}
                title="Pronounce"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={13} />
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {isSatellite && satMeta
                ? `${satMeta.iconEmoji} ${satMeta.orbitType} • Altitude ${satTelemetry?.altitudeKm || satMeta.nominalAltitudeKm} km`
                : isComet && cometMeta
                ? `${cometMeta.iconEmoji} Period ${cometMeta.periodYears} yrs • ${cometState ? `${cometState.distanceAu.toFixed(2)} AU from Sun` : 'Comet'}`
                : isAsteroid && asteroidMeta
                ? `🪨 ${asteroidMeta.missDistanceLunar.toFixed(2)} LD from Earth • ${asteroidMeta.relativeVelocityKmS} km/s`
                : meta && meta.meanDistanceAu > 0
                ? `${meta.meanDistanceAu} AU • ${meta.temperatureKid.split('(')[0].trim()}`
                : 'Star'}
            </div>
          </div>
        </div>

        {/* Right: Expand Facts button + Close X */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '16px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={13} color="#38bdf8" /> Facts ▲
          </button>

          <button
            onClick={clearSelection}
            title="Deselect and Return to Overview"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. EXPANDED SHEET (Mobile Bottom Sheet / Desktop Side Sheet)
  // =========================================================================
  return (
    <div
      style={{
        position: isMobile ? 'fixed' : 'absolute',
        bottom: isMobile ? 0 : 'auto',
        top: isMobile ? 'auto' : '20px',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : '20px',
        width: isMobile ? '100%' : '360px',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 40px)',
        maxHeight: isMobile ? '68vh' : 'calc(100vh - 40px)',
        overflowY: 'auto',
        background: isMobile ? 'rgba(10, 16, 30, 0.95)' : 'rgba(10, 16, 30, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderBottom: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: isMobile ? '24px 24px 0 0' : '24px',
        padding: isMobile ? '14px 18px 24px' : '24px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: isMobile
          ? `0 -10px 40px rgba(0, 0, 0, 0.7), 0 0 40px ${displayColor}22`
          : `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px ${displayColor}22`,
        zIndex: 70,
        animation: isMobile
          ? 'slideUpBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          : 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Mobile Drawer Grab / Collapse Handle */}
      {isMobile && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            cursor: 'pointer',
            padding: '4px 0 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Tap to collapse ▼</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? '12px' : '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {displayEmoji ? (
              <span style={{ fontSize: isMobile ? '18px' : '22px', lineHeight: 1 }}>{displayEmoji}</span>
            ) : (
              <span
                style={{
                  width: isMobile ? '12px' : '14px',
                  height: isMobile ? '12px' : '14px',
                  borderRadius: '50%',
                  background: displayColor,
                  boxShadow: `0 0 10px ${displayColor}`,
                }}
              />
            )}
            <h2 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {displayName}
            </h2>
            <button
              onClick={handleSpeak}
              title="Pronounce name"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                cursor: 'pointer',
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <Volume2 size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => captureSnapshot()}
            title={`Take photo of ${displayName} & share`}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <Camera size={16} />
          </button>

          <button
            onClick={clearSelection}
            title="Close details"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Real-time Lunar Phase Card for the Moon */}
      {selectedId === 'moon' && lunarPhase && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(203, 213, 225, 0.16), rgba(56, 189, 248, 0.10))',
            border: '1.5px solid rgba(203, 213, 225, 0.35)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '30px', lineHeight: 1 }}>{lunarPhase.emoji}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{lunarPhase.phaseName}</span>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>({lunarPhase.percent}%)</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                {lunarEphem ? `${Math.round(lunarEphem.distanceKm).toLocaleString()} km from Earth` : '384,400 km from Earth'}
              </div>
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
            }}
            title={`${lunarPhase.percent}% Illuminated`}
          >
            <div
              style={{
                width: `${lunarPhase.percent}%`,
                height: '100%',
                background: '#38bdf8',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Asteroid / Comet / Spacecraft Telemetry Card OR Kid-Friendly Temperature Badge */}
      {isAsteroid && asteroidMeta ? (
        <div
          style={{
            background: asteroidMeta.isPotentiallyHazardous
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.08))'
              : 'linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(99, 102, 241, 0.08))',
            border: `1px solid ${asteroidMeta.isPotentiallyHazardous ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '11px',
                color: asteroidMeta.isPotentiallyHazardous ? '#fbbf24' : '#38bdf8',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {asteroidMeta.isPotentiallyHazardous ? '⚠️ Near-Earth Hazard Radar' : '🪨 Near-Earth Asteroid Flyby'}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: asteroidMeta.isPotentiallyHazardous ? '#fbbf24' : '#4ade80',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: asteroidMeta.isPotentiallyHazardous ? '#fbbf24' : '#4ade80',
                  boxShadow: asteroidMeta.isPotentiallyHazardous ? '0 0 6px #fbbf24' : '0 0 6px #4ade80',
                }}
              />
              {asteroidMeta.isPotentiallyHazardous ? 'PHA Alert' : 'Close Approach'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Close Approach Distance</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {asteroidMeta.missDistanceLunar.toFixed(2)} LD
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {Math.round(asteroidMeta.missDistanceKm).toLocaleString()} km
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Relative Velocity</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {asteroidMeta.relativeVelocityKmS.toFixed(1)} km/s
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {(asteroidMeta.relativeVelocityKmS * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#cbd5e1',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Close Approach Date:</span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              {asteroidMeta.closeApproachDateFull || asteroidMeta.closeApproachDate}
            </span>
          </div>
        </div>
      ) : isComet && cometMeta && cometState ? (
        <div
          style={{
            background: `linear-gradient(135deg, ${cometMeta.colorHex}18, rgba(56, 189, 248, 0.08))`,
            border: `1px solid ${cometMeta.colorHex}44`,
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: cometMeta.colorHex, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              ☄️ Real-Time Comet Telemetry
            </span>
            <span
              style={{
                fontSize: '11px',
                color: cometState.distanceAu < 3.5 ? '#38bdf8' : '#94a3b8',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: cometState.distanceAu < 3.5 ? '#38bdf8' : '#64748b',
                  boxShadow: cometState.distanceAu < 3.5 ? '0 0 6px #38bdf8' : 'none',
                }}
              />
              {cometState.distanceAu < 3.5 ? 'Active Tails' : 'Dormant Ices'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Distance from Sun</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {cometState.distanceAu.toFixed(2)} AU
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Orbital Speed</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {cometState.speedKmS.toFixed(1)} km/s
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#cbd5e1', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Outgassing Status:</span>
            <span style={{ fontWeight: 600, color: cometState.distanceAu < 3.5 ? '#6ee7b7' : '#94a3b8' }}>
              {cometState.distanceAu < 3.5 ? 'Dual Ion & Dust Tails' : 'Frozen Past Thermal Sublimation Line'}
            </span>
          </div>
        </div>
      ) : isSatellite && satMeta ? (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              🛰️ Live Orbit Telemetry (SGP4)
            </span>
            <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Altitude</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {satTelemetry ? `${Math.round(satTelemetry.altitudeKm).toLocaleString()} km` : `${satMeta.nominalAltitudeKm} km`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Orbital Speed</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                {satTelemetry
                  ? `${(satTelemetry.speedKmH / 3600).toFixed(2)} km/s`
                  : `${(satMeta.speedKmH / 3600).toFixed(2)} km/s`}
              </div>
            </div>
          </div>

          {satTelemetry && (
            <div style={{ fontSize: '11px', color: '#cbd5e1', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Sub-satellite:</span>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                {Math.abs(satTelemetry.latitudeDeg).toFixed(2)}°{satTelemetry.latitudeDeg >= 0 ? 'N' : 'S'}, {Math.abs(satTelemetry.longitudeDeg).toFixed(2)}°{satTelemetry.longitudeDeg >= 0 ? 'E' : 'W'}
              </span>
            </div>
          )}
        </div>
      ) : meta ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '10px 14px',
            marginBottom: '16px',
          }}
        >
          <Thermometer size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: 1.4 }}>
            {meta.temperatureKid}
          </span>
        </div>
      ) : null}

      {/* 4. Fun Fact Banner with Scrollable Arrow Buttons & Dot Indicators */}
      <div
        style={{
          background: `linear-gradient(135deg, ${displayColor}22, rgba(255, 255, 255, 0.04))`,
          border: `1px solid ${displayColor}44`,
          borderRadius: '16px',
          padding: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Header with Title and Arrow Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <Sparkles size={14} /> Did You Know?
          </div>

          {/* Navigation Controls: [counter] < > */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                marginRight: '2px',
              }}
            >
              {currentFactIndex + 1} / {facts.length}
            </span>

            <button
              onClick={handlePrevFact}
              title="Previous fun fact"
              aria-label="Previous fun fact"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              <ChevronLeft size={15} />
            </button>

            <button
              onClick={handleNextFact}
              title="Next fun fact"
              aria-label="Next fun fact"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Fact Text */}
        <p
          key={currentFactIndex}
          style={{
            margin: '0 0 12px 0',
            fontSize: '13.5px',
            lineHeight: 1.55,
            color: '#f8fafc',
            minHeight: '48px',
            animation: 'fadeIn 0.25s ease-out forwards',
          }}
        >
          {facts[currentFactIndex]}
        </p>

        {/* Interactive Dots Pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            paddingTop: '2px',
          }}
        >
          {facts.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setFactIndex(i);
              }}
              title={`Go to fact ${i + 1}`}
              aria-label={`Go to fact ${i + 1}`}
              style={{
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                width: i === currentFactIndex ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background:
                  i === currentFactIndex ? displayColor : 'rgba(255, 255, 255, 0.25)',
                boxShadow:
                  i === currentFactIndex ? `0 0 8px ${displayColor}` : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* 5. Statistics Grid (Asteroid vs Comet vs Spacecraft vs Planet) */}
      {isAsteroid && asteroidMeta ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Estimated Diameter */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Globe size={13} /> Estimated Size
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {asteroidMeta.diameterMeters.min === asteroidMeta.diameterMeters.max
                ? `~${asteroidMeta.diameterMeters.min} m`
                : `${asteroidMeta.diameterMeters.min}–${asteroidMeta.diameterMeters.max} m`}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              {asteroidMeta.diameterMeters.max >= 1000
                ? `${(asteroidMeta.diameterMeters.max / 1000).toFixed(1)} km diameter`
                : 'Near-Earth Object'}
            </div>
          </div>

          {/* Miss Distance */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Orbit size={13} /> Miss Distance
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {asteroidMeta.missDistanceLunar.toFixed(2)} LD
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {asteroidMeta.missDistanceAu.toFixed(4)} AU from Earth
            </div>
          </div>

          {/* Relative Velocity */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Thermometer size={13} /> Flyby Speed
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {asteroidMeta.relativeVelocityKmS.toFixed(1)} km/s
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              Hyperbolic Trajectory
            </div>
          </div>

          {/* Hazard Classification */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Clock size={13} /> Classification
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: asteroidMeta.isPotentiallyHazardous ? '#fbbf24' : '#4ade80',
              }}
            >
              {asteroidMeta.isPotentiallyHazardous ? 'PHA Hazard' : 'Non-Hazardous'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Abs. Mag H: {asteroidMeta.absoluteMagnitudeH !== undefined ? asteroidMeta.absoluteMagnitudeH.toFixed(1) : 'N/A'}
            </div>
          </div>
        </div>
      ) : isComet && cometMeta ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Orbital Period */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Orbit size={13} /> Orbital Period
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {cometMeta.periodYears} yrs
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              e = {cometMeta.elements.e.toFixed(3)}
            </div>
          </div>

          {/* Perihelion Distance */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Thermometer size={13} /> Perihelion (Closest)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {cometMeta.perihelionAu} AU
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {cometMeta.lastPerihelion.split(',')[0]}
            </div>
          </div>

          {/* Aphelion Distance */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Globe size={13} /> Aphelion (Farthest)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {cometMeta.aphelionAu} AU
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              Deep Kuiper / Oort
            </div>
          </div>

          {/* Next Return */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Clock size={13} /> Next Return
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {cometMeta.nextPerihelion.split(',')[0]}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Next Perihelion
            </div>
          </div>
        </div>
      ) : isSatellite && satMeta ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Nominal Altitude */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Globe size={13} /> Orbit Altitude
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {satMeta.nominalAltitudeKm.toLocaleString()} km
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              {satMeta.orbitType}
            </div>
          </div>

          {/* Orbital Period */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Orbit size={13} /> Orbital Period
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {satMeta.nominalPeriodMinutes.toFixed(1)} mins
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              ~{(1440 / satMeta.nominalPeriodMinutes).toFixed(1)} orbits / day
            </div>
          </div>

          {/* Crew / Type */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px' }}>👨‍🚀</span> Crew Capacity
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {satMeta.crewCapacity > 0 ? `${satMeta.crewCapacity} astronauts` : 'Robotic / Uncrewed'}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px', textTransform: 'capitalize' }}>
              {satMeta.category.replace('_', ' ')}
            </div>
          </div>

          {/* Launch Year & Mass */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Clock size={13} /> Launched
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {satMeta.launchYear}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              NORAD #{satMeta.noradId}
            </div>
          </div>
        </div>
      ) : meta ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Size */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Globe size={13} /> Size (Radius)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {meta.radiusKm.toLocaleString()} km
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              {meta.earthRadiusRatio === 1 ? 'Earth Standard' : `${meta.earthRadiusRatio}× Earth`}
            </div>
          </div>

          {/* Orbit / Year */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Orbit size={13} /> {selectedId === 'moon' ? 'Orbital Period' : 'Length of Year'}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {selectedId === 'moon'
                ? '27.3 Earth days'
                : meta.orbitalPeriodDays === 0
                ? 'Center of System'
                : meta.orbitalPeriodDays >= 365
                ? `${(meta.orbitalPeriodDays / 365.25).toFixed(1)} Earth yrs`
                : `${meta.orbitalPeriodDays.toFixed(0)} Earth days`}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {selectedId === 'moon'
                ? 'Tidally locked to Earth'
                : meta.meanDistanceAu > 0
                ? `${meta.meanDistanceAu} AU from Sun`
                : 'Origin'}
            </div>
          </div>

          {/* Day Length */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Clock size={13} /> Day Length
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {Math.abs(meta.rotationPeriodHours) >= 48
                ? `${(Math.abs(meta.rotationPeriodHours) / 24).toFixed(1)} Earth days`
                : `${Math.abs(meta.rotationPeriodHours).toFixed(1)} hours`}
            </div>
            {meta.rotationPeriodHours < 0 && (
              <div style={{ fontSize: '10px', color: '#f87171', marginTop: '2px' }}>
                Spins Backwards!
              </div>
            )}
          </div>

          {/* Axial Tilt */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px' }}>📐</span> Axial Tilt
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {meta.axialTiltDeg.toFixed(1)}°
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {meta.axialTiltDeg > 90 ? 'Tilted on side' : 'Orbital obliquity'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
