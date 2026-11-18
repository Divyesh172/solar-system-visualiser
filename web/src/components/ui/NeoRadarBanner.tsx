import { useState, useEffect, type FC } from 'react';
import { ShieldAlert, Eye, Calendar, X, ChevronRight } from 'lucide-react';
import { useAsteroidStore } from '../../state/useAsteroidStore';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useFocusStore } from '../../state/useFocusStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { dateToJde } from '../../science/time';
import { formatMissDistance, type NearEarthAsteroid } from '../../science/nasaNeoApi';

export const NeoRadarBanner: FC = () => {
  const asteroids = useAsteroidStore((state) => state.asteroids);
  const activeAlert = useAsteroidStore((state) => state.activeAlert);
  const setActiveAlert = useAsteroidStore((state) => state.setActiveAlert);
  const selectBody = useFocusStore((state) => state.selectBody);
  const jumpToJde = useSimulationClock((state) => state.jumpToJde);
  const isMobile = useIsMobile();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Pick asteroid to feature: active alert or closest historical asteroid (e.g. 2024 MK or Apophis)
  const featuredAsteroid: NearEarthAsteroid | null =
    activeAlert || (asteroids.length > 0 ? asteroids[0] : null);

  // Re-open banner if a live flyby alert fires
  useEffect(() => {
    if (activeAlert) {
      setIsDismissed(false);
    }
  }, [activeAlert]);

  if (!featuredAsteroid || isDismissed) {
    return null;
  }

  const isHazard = featuredAsteroid.isPotentiallyHazardous;
  const accentColor = isHazard ? '#f59e0b' : '#38bdf8';

  const handleJumpToFlyby = () => {
    const flybyDate = new Date(featuredAsteroid.epochDateCloseApproach);
    const jde = dateToJde(flybyDate);
    jumpToJde(jde);
  };

  const handleFocusAsteroid = () => {
    selectBody({
      id: featuredAsteroid.id,
      name: featuredAsteroid.name,
      radius: 0.35,
      type: 'asteroid',
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? '124px' : '106px',
        left: isMobile ? '10px' : '20px',
        zIndex: 42,
        maxWidth: isMobile ? 'calc(100vw - 20px)' : '320px',
        background: 'rgba(10, 16, 32, 0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${accentColor}66`,
        borderRadius: '16px',
        padding: isMobile ? '8px 12px' : '10px 14px',
        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px ${accentColor}22`,
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideInTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <ShieldAlert size={16} color={accentColor} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            Near-Earth Asteroid Radar
          </span>
          {activeAlert && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                background: '#ef4444',
                color: '#ffffff',
                padding: '1px 5px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}
            >
              LIVE
            </span>
          )}
        </div>

        <button
          onClick={() => {
            setIsDismissed(true);
            setActiveAlert(null);
          }}
          title="Dismiss banner"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Asteroid Details */}
      <div style={{ marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            🪨 {featuredAsteroid.name}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>
            {featuredAsteroid.missDistanceLunar.toFixed(2)} LD
          </span>
        </div>

        <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
          Passes Earth at {formatMissDistance(featuredAsteroid.missDistanceLunar, featuredAsteroid.missDistanceKm)}
        </div>

        {/* Expanded Telemetry */}
        {isExpanded && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8' }}>Est. Diameter:</span>{' '}
              <strong style={{ color: '#f8fafc' }}>~{featuredAsteroid.diameterMeters.avg} m</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Flyby Speed:</span>{' '}
              <strong style={{ color: '#f8fafc' }}>{featuredAsteroid.relativeVelocityKmS} km/s</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Flyby Date:</span>{' '}
              <strong style={{ color: '#f8fafc' }}>{featuredAsteroid.closeApproachDate}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Hazard:</span>{' '}
              <strong style={{ color: isHazard ? '#f59e0b' : '#4ade80' }}>
                {isHazard ? 'Hazardous' : 'Safe'}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        <button
          onClick={handleFocusAsteroid}
          style={{
            flex: 1,
            background: 'rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            borderRadius: '10px',
            padding: '5px 8px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <Eye size={12} color="#38bdf8" /> Inspect in 3D
        </button>

        <button
          onClick={handleJumpToFlyby}
          title={`Jump to ${featuredAsteroid.closeApproachDateFull}`}
          style={{
            flex: 1,
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: '10px',
            padding: '5px 8px',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <Calendar size={12} color="#fbbf24" /> Jump to Flyby
        </button>

        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'Collapse specs' : 'Expand specs'}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '10px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
