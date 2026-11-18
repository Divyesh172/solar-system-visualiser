import { useState, useRef, useEffect, type FC } from 'react';
import { Plus, Minus, RotateCcw, Sparkles, X, MapPin } from 'lucide-react';
import type { CameraControls } from '@react-three/drei';
import { useFocusStore } from '../../state/useFocusStore';
import { useSatelliteStore } from '../../state/useSatelliteStore';
import { useSkyStore } from '../../state/useSkyStore';
import { useGroundObserverStore } from '../../state/useGroundObserverStore';
import { PRESET_LOCATIONS } from '../../science/topocentricCoordinates';
import { useIsMobile } from '../../utils/useMediaQuery';

interface ToggleRowProps {
  label: string;
  subtitle: string;
  icon: string;
  checked: boolean;
  onToggle: () => void;
  accentColor?: string;
}

const ToggleRow: FC<ToggleRowProps> = ({
  label,
  subtitle,
  icon,
  checked,
  onToggle,
  accentColor = '#38bdf8',
}) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 9px',
      borderRadius: '12px',
      background: checked ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
      cursor: 'pointer',
      transition: 'background 0.15s ease',
      userSelect: 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{subtitle}</div>
      </div>
    </div>

    {/* Toggle Switch */}
    <div
      style={{
        width: '34px',
        height: '19px',
        borderRadius: '10px',
        background: checked ? accentColor : 'rgba(255, 255, 255, 0.16)',
        boxShadow: checked ? `0 0 10px ${accentColor}88` : 'none',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: checked ? '17px' : '2px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
          transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  </div>
);

interface ZoomControlsProps {
  controlsRef: React.RefObject<CameraControls | null>;
}

export const ZoomControls: FC<ZoomControlsProps> = ({ controlsRef }) => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const clearSelection = useFocusStore((state) => state.clearSelection);
  const showSatellites = useSatelliteStore((state) => state.showSatellites);
  const toggleSatellites = useSatelliteStore((state) => state.toggleSatellites);

  const showConstellationLines = useSkyStore((state) => state.showConstellationLines);
  const showConstellationNames = useSkyStore((state) => state.showConstellationNames);
  const showDeepSkyObjects = useSkyStore((state) => state.showDeepSkyObjects);
  const toggleConstellationLines = useSkyStore((state) => state.toggleConstellationLines);
  const toggleConstellationNames = useSkyStore((state) => state.toggleConstellationNames);
  const toggleDeepSkyObjects = useSkyStore((state) => state.toggleDeepSkyObjects);
  const setConstellationLines = useSkyStore((state) => state.setConstellationLines);
  const setConstellationNames = useSkyStore((state) => state.setConstellationNames);
  const setDeepSkyObjects = useSkyStore((state) => state.setDeepSkyObjects);

  const viewMode = useGroundObserverStore((state) => state.viewMode);
  const toggleViewMode = useGroundObserverStore((state) => state.toggleViewMode);
  const location = useGroundObserverStore((state) => state.location);
  const setLocation = useGroundObserverStore((state) => state.setLocation);
  const showCompassRing = useGroundObserverStore((state) => state.showCompassRing);
  const showCardinalLabels = useGroundObserverStore((state) => state.showCardinalLabels);
  const showPlanetMarkers = useGroundObserverStore((state) => state.showPlanetMarkers);
  const showAltAzGrid = useGroundObserverStore((state) => state.showAltAzGrid);
  const setShowCompassRing = useGroundObserverStore((state) => state.setShowCompassRing);
  const setShowCardinalLabels = useGroundObserverStore((state) => state.setShowCardinalLabels);
  const setShowPlanetMarkers = useGroundObserverStore((state) => state.setShowPlanetMarkers);
  const setShowAltAzGrid = useGroundObserverStore((state) => state.setShowAltAzGrid);

  const [isSkyMenuOpen, setIsSkyMenuOpen] = useState(false);
  const skyMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Close popover when clicking outside
  useEffect(() => {
    if (!isSkyMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (skyMenuRef.current && !skyMenuRef.current.contains(e.target as Node)) {
        setIsSkyMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isSkyMenuOpen]);

  const handleZoomIn = () => {
    controlsRef.current?.dolly(40, true);
  };

  const handleZoomOut = () => {
    controlsRef.current?.dolly(-40, true);
  };

  const handleReset = () => {
    clearSelection();
    controlsRef.current?.setLookAt(0, 80, 160, 0, 0, 0, true);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: isMobile ? (selectedId ? '74px' : '102px') : '24px',
        left: isMobile ? '10px' : '24px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '4px' : '6px',
        background: 'rgba(10, 16, 30, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: '16px',
        padding: isMobile ? '4px' : '6px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55)',
        transition: 'bottom 0.25s ease',
      }}
    >
      {/* 1. Planetarium Sky Dome Settings Popover Button */}
      <div style={{ position: 'relative' }} ref={skyMenuRef}>
        <button
          onClick={() => setIsSkyMenuOpen((prev) => !prev)}
          title="Planetarium Sky Dome Settings (Constellations & Deep Sky)"
          style={{
            background: isSkyMenuOpen || showConstellationLines ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: isSkyMenuOpen ? '1.5px solid #38bdf8' : showConstellationLines ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
            borderRadius: '10px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            color: isSkyMenuOpen || showConstellationLines ? '#38bdf8' : '#cbd5e1',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1.0)';
          }}
        >
          <Sparkles size={16} />
        </button>

        {/* Planetarium Sky Dome Popover Card */}
        {isSkyMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: '44px',
              bottom: isMobile ? '-20px' : '0',
              width: isMobile ? '260px' : '285px',
              maxHeight: '75vh',
              overflowY: 'auto',
              background: 'rgba(10, 16, 32, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '18px',
              padding: '14px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.15)',
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              zIndex: 60,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="#38bdf8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.2px' }}>
                  Sky & Observer Settings
                </span>
              </div>
              <button
                onClick={() => setIsSkyMenuOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Constellation & Deep Sky Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
              <ToggleRow
                label="Constellation Lines"
                subtitle="22 IAU stick figures"
                icon="📐"
                checked={showConstellationLines}
                onToggle={toggleConstellationLines}
                accentColor="#38bdf8"
              />
              <ToggleRow
                label="Constellation Names"
                subtitle="Latin & English labels"
                icon="🏷️"
                checked={showConstellationNames}
                onToggle={toggleConstellationNames}
                accentColor="#fbbf24"
              />
              <ToggleRow
                label="Deep Sky Objects"
                subtitle="12 Messier nebulae & galaxies"
                icon="🌌"
                checked={showDeepSkyObjects}
                onToggle={toggleDeepSkyObjects}
                accentColor="#c084fc"
              />
            </div>

            {/* Presets Toolbar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                onClick={() => {
                  setConstellationLines(true);
                  setConstellationNames(true);
                  setDeepSkyObjects(true);
                }}
                style={{
                  flex: 1,
                  background: 'rgba(56, 189, 248, 0.16)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '10px',
                  padding: '5px 4px',
                  color: '#38bdf8',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                ✨ Planetarium
              </button>
              <button
                onClick={() => {
                  setConstellationLines(false);
                  setConstellationNames(false);
                  setDeepSkyObjects(false);
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '5px 4px',
                  color: '#cbd5e1',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                🌌 Stars Only
              </button>
            </div>

            {/* Observer Location Section */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '9px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="#4ade80" /> Observer City:
                </span>
                <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>
                  {location.flagEmoji} {location.name}
                </span>
              </div>

              {/* City Presets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                {PRESET_LOCATIONS.map((preset) => {
                  const isSelected = location.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setLocation(preset)}
                      style={{
                        background: isSelected ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '4px 6px',
                        color: isSelected ? '#4ade80' : '#cbd5e1',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.flagEmoji} {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* Ground Mode View Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <ToggleRow
                  label="Compass Dial"
                  subtitle="360° cardinal horizon ring"
                  icon="🧭"
                  checked={showCompassRing}
                  onToggle={() => setShowCompassRing(!showCompassRing)}
                  accentColor="#38bdf8"
                />
                <ToggleRow
                  label="Cardinal Direction Labels"
                  subtitle="Floating N, E, S, W markers"
                  icon="🏷️"
                  checked={showCardinalLabels}
                  onToggle={() => setShowCardinalLabels(!showCardinalLabels)}
                  accentColor="#4ade80"
                />
                <ToggleRow
                  label="Visible Planets"
                  subtitle="Topocentric markers & tips"
                  icon="🪐"
                  checked={showPlanetMarkers}
                  onToggle={() => setShowPlanetMarkers(!showPlanetMarkers)}
                  accentColor="#f59e0b"
                />
                <ToggleRow
                  label="Alt/Az Dome Grid"
                  subtitle="Planetarium coordinate lines"
                  icon="🌐"
                  checked={showAltAzGrid}
                  onToggle={() => setShowAltAzGrid(!showAltAzGrid)}
                  accentColor="#c084fc"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Earth Satellites (ISS, Hubble) Toggle */}
      <button
        onClick={toggleSatellites}
        title={showSatellites ? 'Hide Earth Satellites (ISS, Hubble)' : 'Show Earth Satellites (ISS, Hubble)'}
        style={{
          background: showSatellites ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          border: showSatellites ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
          borderRadius: '10px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1.0)';
        }}
      >
        <span>🛰️</span>
      </button>

      {/* 3. Stand on Earth (Ground Backyard Observer View) Toggle */}
      <button
        onClick={toggleViewMode}
        title={
          viewMode === 'ground'
            ? `Return to Space Orbit (currently observing from ${location.name})`
            : `Stand on Earth (Backyard Observer View from ${location.name})`
        }
        style={{
          background:
            viewMode === 'ground'
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(56, 189, 248, 0.25))'
              : 'rgba(255, 255, 255, 0.08)',
          border: viewMode === 'ground' ? '1.5px solid #4ade80' : 'none',
          borderRadius: '10px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: viewMode === 'ground' ? '0 0 12px rgba(74, 222, 128, 0.5)' : 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1.0)';
        }}
      >
        <span>{viewMode === 'ground' ? '🚀' : '🏡'}</span>
      </button>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.12)', margin: '2px 0' }} />

      {/* 3. Zoom Controls */}
      <button
        onClick={handleZoomIn}
        data-tutorial="zoom-controls"
        title="Zoom In (+)"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'none',
          borderRadius: '10px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)';
          e.currentTarget.style.color = '#38bdf8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color = '#ffffff';
        }}
      >
        <Plus size={18} />
      </button>

      <button
        onClick={handleZoomOut}
        title="Zoom Out (−)"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'none',
          borderRadius: '10px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)';
          e.currentTarget.style.color = '#38bdf8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color = '#ffffff';
        }}
      >
        <Minus size={18} />
      </button>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.12)', margin: '2px 0' }} />

      <button
        onClick={handleReset}
        title="Reset Solar System Overview"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'none',
          borderRadius: '10px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38bdf8',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)';
          e.currentTarget.style.transform = 'rotate(-45deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.transform = 'rotate(0deg)';
        }}
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
};
