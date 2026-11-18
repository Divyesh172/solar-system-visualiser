import { useState, type FC } from 'react';
import { Eye, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { useFocusStore } from '../../state/useFocusStore';
import { useTourStore } from '../../state/useTourStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { PLANETARY_METADATA } from '../../science/constants';
import { captureSnapshot } from '../../utils/captureSnapshot';
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

/**
 * PlanetDock: Collapsible dual-deck quick-jump navigation dock for Planets & Moons.
 * 
 * Features:
 * - Independent collapsible decks for Planets & Moons (both default: open)
 * - Color-coded body badges
 * - Click triggers cinematic camera flight to that world
 * - Overview button to smoothly reset camera to full solar system view
 * - Space photo snapshot button
 */
export const PlanetDock: FC = () => {
  const [isPlanetsOpen, setIsPlanetsOpen] = useState(true);
  const [isMoonsOpen, setIsMoonsOpen] = useState(true);
  const isMobile = useIsMobile();

  const selectedId = useFocusStore((state) => state.selectedId);
  const selectBody = useFocusStore((state) => state.selectBody);
  const clearSelection = useFocusStore((state) => state.clearSelection);

  const areBothCollapsed = !isPlanetsOpen && !isMoonsOpen;
  const isTourOpen = useTourStore((state) => state.isOpen);

  // On mobile, hide the bottom dock when a planet is selected or when a tour is running
  if (isMobile && (selectedId !== null || isTourOpen)) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: isMobile ? '10px' : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: areBothCollapsed ? 'row' : 'column',
        alignItems: 'center',
        gap: areBothCollapsed ? '8px' : isMobile ? '6px' : '8px',
        maxWidth: isMobile ? 'calc(100vw - 16px)' : 'calc(100vw - 32px)',
        width: isMobile ? 'calc(100vw - 16px)' : 'auto',
        pointerEvents: 'none',
        transition: 'all 0.25s ease',
      }}
    >
      {/* =================================================================== */}
      {/* 1. MOONS DOCK / TOGGLE PILL (Top Deck)                              */}
      {/* =================================================================== */}
      {isMoonsOpen ? (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '6px',
            background: 'rgba(10, 16, 30, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '32px',
            padding: isMobile ? '4px 8px 4px 10px' : '5px 12px 5px 14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
            maxWidth: '100%',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#e2e8f0',
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: 600,
              padding: '2px 4px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: isMobile ? '12px' : '13px' }}>🌕</span> Moons
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px', flexShrink: 0 }} />

          {/* Moons Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '5px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
            }}
          >
            {MOON_DOCK_ITEMS.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    selectBody({
                      id: item.id,
                      name: item.name,
                      radius: item.radius,
                      type: 'moon',
                    })
                  }
                  title={`Fly to ${item.name} (${item.parentName}'s moon)`}
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: isMobile ? '4px 7px' : '5px 9px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    fontSize: isMobile ? '10.5px' : '11.5px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 12px ${item.color}55` : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1.0)',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
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
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 5px ${item.color}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px', flexShrink: 0 }} />

            {/* Collapse Moons Button */}
            <button
              onClick={() => setIsMoonsOpen(false)}
              title="Collapse Moons Dock"
              aria-label="Collapse Moons Dock"
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
      ) : (
        /* Collapsed Moons Toggle Pill */
        <button
          onClick={() => setIsMoonsOpen(true)}
          title="Open Moons Dock"
          aria-label="Open Moons Dock"
          style={{
            pointerEvents: 'auto',
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
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(203, 213, 225, 0.15)',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
            e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.6)';
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.7), 0 0 20px rgba(203, 213, 225, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(203, 213, 225, 0.15)';
          }}
        >
          <span style={{ fontSize: '14px' }}>🌕</span>
          <span>Moons</span>
          <ChevronUp size={15} color="#cbd5e1" />
        </button>
      )}

      {/* =================================================================== */}
      {/* 2. PLANETS DOCK / TOGGLE PILL (Bottom Deck)                         */}
      {/* =================================================================== */}
      {isPlanetsOpen ? (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '8px',
            background: 'rgba(10, 16, 30, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '32px',
            padding: isMobile ? '5px 8px 5px 10px' : '8px 12px 8px 16px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
            maxWidth: '100%',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Reset to Overview Button */}
          <button
            onClick={clearSelection}
            title="Full Solar System Overview"
            style={{
              background: selectedId === null ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: selectedId === null ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: isMobile ? '4px 8px' : '6px 12px',
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
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              if (selectedId !== null) {
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            <Eye size={isMobile ? 12 : 14} /> Overview
          </button>

          <div style={{ width: '1px', height: '22px', background: 'rgba(255, 255, 255, 0.16)', margin: '0 2px', flexShrink: 0 }} />

          {/* Celestial Body Quick-Jump Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
            }}
          >
            {PLANET_DOCK_ITEMS.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  data-tutorial={item.id === 'earth' ? 'earth-button' : undefined}
                  onClick={() =>
                    selectBody({
                      id: item.id,
                      name: item.name,
                      radius: item.radius,
                      type: item.id === 'sun' ? 'star' : 'planet',
                    })
                  }
                  title={`Fly to ${item.name}`}
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: isMobile ? '4px 8px' : '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '6px',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 14px ${item.color}55` : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1.0)',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
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
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 6px ${item.color}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}

            <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px', flexShrink: 0 }} />

            {/* Photo Snapshot Button */}
            <button
              onClick={() => captureSnapshot()}
              data-tutorial="photo-button"
              title="Take Space Snapshot & Share"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.18))',
                border: '1px solid rgba(56, 189, 248, 0.38)',
                borderRadius: '20px',
                padding: '6px 13px',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.35))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.18))';
              }}
            >
              <Camera size={14} color="#38bdf8" /> {!isMobile && 'Photo'}
            </button>

            <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px', flexShrink: 0 }} />

            {/* Collapse Planets Button */}
            <button
              onClick={() => setIsPlanetsOpen(false)}
              title="Collapse Planets Dock"
              aria-label="Collapse Planets Dock"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
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
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Planets Toggle Pill */
        <button
          onClick={() => setIsPlanetsOpen(true)}
          title="Open Planets Dock"
          aria-label="Open Planets Dock"
          style={{
            pointerEvents: 'auto',
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
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15)';
          }}
        >
          <span style={{ fontSize: '14px' }}>🪐</span>
          <span>Planets</span>
          <ChevronUp size={15} color="#38bdf8" />
        </button>
      )}
    </div>
  );
};
