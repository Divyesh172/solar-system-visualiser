import { useState, useEffect, type FC } from 'react';
import { Html } from '@react-three/drei';
import { useFocusStore } from '../../state/useFocusStore';
import { useSimulationClock } from '../../science/useSimulationClock';
import { getPlanetSunDistance, type PlanetKey } from '../../science/ephemeris';
import { PLANETARY_METADATA } from '../../science/constants';

interface PlanetLabelProps {
  id: PlanetKey;
  name: string;
  phonetic?: string;
  radius: number;
}

export const PlanetLabel: FC<PlanetLabelProps> = ({ id, name, radius }) => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const selectBody = useFocusStore((state) => state.selectBody);
  const [isHovered, setIsHovered] = useState(false);

  const [distAu, setDistAu] = useState(() =>
    id === 'sun' ? 0 : getPlanetSunDistance(id, useSimulationClock.getState().currentJde)
  );

  // Periodically refresh AU distance (every 500ms) without triggering 60fps re-renders
  useEffect(() => {
    if (id === 'sun') return;
    const interval = setInterval(() => {
      const jde = useSimulationClock.getState().currentJde;
      setDistAu(getPlanetSunDistance(id, jde));
    }, 500);
    return () => clearInterval(interval);
  }, [id]);

  const meta = PLANETARY_METADATA[id];
  const planetColor = meta?.colorHex || '#38bdf8';
  const isSelected = selectedId === id;
  const isAnotherSelected = selectedId !== null && !isSelected;

  // Elevation offset above the planet sphere so the label never obstructs the planet
  const yOffset = id === 'sun' ? radius + 3.8 : radius + 2.8;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: isAnotherSelected ? 0.65 : 1.0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            selectBody({ id, name, radius, type: id === 'sun' ? 'star' : 'planet' });
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            pointerEvents: 'auto',
            background: isSelected
              ? 'rgba(15, 23, 42, 0.94)'
              : isHovered
              ? 'rgba(15, 23, 42, 0.88)'
              : 'rgba(8, 14, 28, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: isSelected
              ? `1.5px solid ${planetColor}`
              : isHovered
              ? `1.5px solid ${planetColor}`
              : '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '9999px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: isSelected
              ? `0 0 16px ${planetColor}88, 0 4px 12px rgba(0, 0, 0, 0.6)`
              : isHovered
              ? `0 0 12px ${planetColor}55, 0 4px 10px rgba(0, 0, 0, 0.5)`
              : '0 3px 8px rgba(0, 0, 0, 0.4)',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            transform: isHovered || isSelected ? 'scale(1.06)' : 'scale(1.0)',
            transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Planet Color Indicator Dot */}
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: planetColor,
              boxShadow: `0 0 6px ${planetColor}`,
              flexShrink: 0,
            }}
          />

          {/* Planet Name */}
          <span
            style={{
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.3px',
              color: '#f8fafc',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            }}
          >
            {name}
          </span>

          {/* Subtle AU Distance (for planets) */}
          {id !== 'sun' && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 500,
                color: isHovered ? '#7dd3fc' : 'rgba(148, 163, 184, 0.85)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.2px',
                marginLeft: '1px',
              }}
            >
              {distAu.toFixed(2)} AU
            </span>
          )}
        </button>

        {/* Subtle vertical leader stem pointing to the planet */}
        <div
          style={{
            width: '1px',
            height: '9px',
            background: `linear-gradient(to bottom, ${planetColor}99, ${planetColor}15)`,
          }}
        />
        {/* Base anchor dot */}
        <div
          style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: planetColor,
            boxShadow: `0 0 4px ${planetColor}`,
            opacity: isHovered || isSelected ? 0.9 : 0.6,
          }}
        />
      </div>
    </Html>
  );
};
