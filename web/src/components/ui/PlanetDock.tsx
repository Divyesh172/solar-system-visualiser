import { useState, type FC } from 'react';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useFocusStore } from '../../state/useFocusStore';
import { useTourStore } from '../../state/useTourStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { PLANETARY_METADATA } from '../../science/constants';
import type { PlanetKey } from '../../science/ephemeris';

interface PlanetDockItem {
  id: PlanetKey;
  name: string;
  color: string;
  radius: number;
}

interface MoonDockItem {
  id: string;
  name: string;
  parentName: string;
  color: string;
  radius: number;
}

const PLANET_DOCK_ITEMS: PlanetDockItem[] = [
  { id: 'sun',     name: 'Sun',     color: PLANETARY_METADATA.sun.colorHex,     radius: 4.2 },
  { id: 'mercury', name: 'Mercury', color: PLANETARY_METADATA.mercury.colorHex, radius: 0.85 },
  { id: 'venus',   name: 'Venus',   color: PLANETARY_METADATA.venus.colorHex,   radius: 2.1 },
  { id: 'earth',   name: 'Earth',   color: PLANETARY_METADATA.earth.colorHex,   radius: 2.2 },
  { id: 'mars',    name: 'Mars',    color: PLANETARY_METADATA.mars.colorHex,    radius: 1.18 },
  { id: 'jupiter', name: 'Jupiter', color: PLANETARY_METADATA.jupiter.colorHex, radius: 3.8 },
  { id: 'saturn',  name: 'Saturn',  color: PLANETARY_METADATA.saturn.colorHex,  radius: 3.2 },
  { id: 'uranus',  name: 'Uranus',  color: PLANETARY_METADATA.uranus.colorHex,  radius: 2.4 },
  { id: 'neptune', name: 'Neptune', color: PLANETARY_METADATA.neptune.colorHex, radius: 2.3 },
];

const MOON_DOCK_ITEMS: MoonDockItem[] = [
  { id: 'moon',     name: 'Moon',     parentName: 'Earth',   color: '#cbd5e1', radius: 0.59 },
  { id: 'io',       name: 'Io',       parentName: 'Jupiter', color: '#e6cc80', radius: 0.38 },
  { id: 'europa',   name: 'Europa',   parentName: 'Jupiter', color: '#a0c4e8', radius: 0.34 },
  { id: 'ganymede', name: 'Ganymede', parentName: 'Jupiter', color: '#b8b09d', radius: 0.58 },
  { id: 'callisto', name: 'Callisto', parentName: 'Jupiter', color: '#8a8a99', radius: 0.54 },
  { id: 'titan',    name: 'Titan',    parentName: 'Saturn',  color: '#e08a38', radius: 0.56 },
  { id: 'triton',   name: 'Triton',   parentName: 'Neptune', color: '#a0d0e0', radius: 0.32 },
];

const bodyBtnStyle = (isSelected: boolean, color: string, isMobile: boolean): React.CSSProperties => ({
  background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
  border: isSelected ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: isMobile ? '4px 7px' : '5px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  color: isSelected ? '#ffffff' : '#cbd5e1',
  fontSize: isMobile ? '10.5px' : '12px',
  fontWeight: isSelected ? 600 : 400,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  flexShrink: 0,
  boxShadow: isSelected ? `0 0 12px ${color}55` : 'none',
  transform: isSelected ? 'scale(1.05)' : 'scale(1.0)',
  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
});

/**
 * PlanetDock: Single-row collapsible quick-jump dock for Planets & Moons.
 *
 * Layout: [👁 Overview] | [🌕 Moon Io Europa …] | [🪐 Sun Mercury … Neptune] [▼]
 * - Single collapse pill — no duplicate decks
 * - No Photo button (Photo lives in TimeScrubber)
 */
export const PlanetDock: FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();

  const selectedId = useFocusStore((state) => state.selectedId);
  const selectBody  = useFocusStore((state) => state.selectBody);
  const clearSelection = useFocusStore((state) => state.clearSelection);
  const isTourOpen  = useTourStore((state) => state.isOpen);

  // On mobile, hide the bottom dock when a planet is selected or during a tour
  if (isMobile && (selectedId !== null || isTourOpen)) {
    return null;
  }

  /* ── COLLAPSED STATE ── */
  if (!isOpen) {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '10px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          title="Open Navigation Dock"
          aria-label="Open Navigation Dock"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(10, 16, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '24px',
            padding: '7px 16px',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15)',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.55)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
          }}
        >
          <span style={{ fontSize: '14px' }}>🪐</span>
          <span>Navigation</span>
          <ChevronUp size={15} color="#38bdf8" />
        </button>
      </div>
    );
  }

  /* ── OPEN STATE — single scrollable row ── */
  return (
    <div
      style={{
        position: 'absolute',
        bottom: isMobile ? '10px' : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        pointerEvents: 'auto',
        maxWidth: isMobile ? 'calc(100vw - 16px)' : 'calc(100vw - 200px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '4px' : '6px',
          background: 'rgba(10, 16, 30, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '32px',
          padding: isMobile ? '5px 8px 5px 10px' : '7px 10px 7px 14px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Overview Button ── */}
        <button
          onClick={clearSelection}
          title="Full Solar System Overview"
          style={{
            background: selectedId === null ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
            border: selectedId === null ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: isMobile ? '4px 8px' : '5px 11px',
            color: selectedId === null ? '#38bdf8' : '#94a3b8',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease-out',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
          onMouseLeave={(e) => { if (selectedId !== null) e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Eye size={isMobile ? 12 : 13} /> Overview
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.16)', flexShrink: 0 }} />

        {/* ── Moons section header ── */}
        {!isMobile && (
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            🌕
          </span>
        )}

        {/* Moon buttons */}
        {MOON_DOCK_ITEMS.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => selectBody({ id: item.id, name: item.name, radius: item.radius, type: 'moon' })}
              title={`Fly to ${item.name} (${item.parentName}'s moon)`}
              style={bodyBtnStyle(isSelected, item.color, isMobile)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.borderColor = item.color;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'scale(1.0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, boxShadow: `0 0 4px ${item.color}`, flexShrink: 0 }} />
              <span>{item.name}</span>
            </button>
          );
        })}

        {/* Section divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.16)', flexShrink: 0 }} />

        {/* ── Planets section header ── */}
        {!isMobile && (
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            🪐
          </span>
        )}

        {/* Planet buttons */}
        {PLANET_DOCK_ITEMS.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              data-tutorial={item.id === 'earth' ? 'earth-button' : undefined}
              onClick={() => selectBody({ id: item.id, name: item.name, radius: item.radius, type: item.id === 'sun' ? 'star' : 'planet' })}
              title={`Fly to ${item.name}`}
              style={bodyBtnStyle(isSelected, item.color, isMobile)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.borderColor = item.color;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'scale(1.0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 5px ${item.color}`, flexShrink: 0 }} />
              <span>{item.name}</span>
            </button>
          );
        })}

        {/* Divider before collapse */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

        {/* ── Single collapse button ── */}
        <button
          onClick={() => setIsOpen(false)}
          title="Collapse Navigation Dock"
          aria-label="Collapse Navigation Dock"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};
