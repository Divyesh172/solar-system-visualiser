import { useState, useMemo, type FC } from 'react';
import { Html } from '@react-three/drei';
import { CONSTELLATIONS, type Constellation } from '../../assets/constellations';
import { DEEP_SKY_OBJECTS, dsoToCartesian, type DeepSkyObject } from '../../assets/deepSkyObjects';
import { radecToCartesian } from '../StarfieldCatalog';
import { useSkyStore } from '../../state/useSkyStore';

interface ConstellationLabelItemProps {
  constellation: Constellation;
  radius: number;
}

const ConstellationLabelItem: FC<ConstellationLabelItemProps> = ({ constellation, radius }) => {
  const [isHovered, setIsHovered] = useState(false);

  const position = useMemo(() => {
    return radecToCartesian(constellation.centroid.ra, constellation.centroid.dec, radius);
  }, [constellation.centroid.ra, constellation.centroid.dec, radius]);

  const colorHex =
    constellation.family === 'zodiac'
      ? '#fbbf24'
      : constellation.family === 'southern'
      ? '#a78bfa'
      : '#38bdf8';

  return (
    <Html
      position={position}
      center
      zIndexRange={[20, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'transform 0.15s ease, opacity 0.15s ease',
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
          cursor: 'default',
          transform: isHovered ? 'scale(1.1)' : 'scale(1.0)',
          opacity: isHovered ? 1.0 : 0.72,
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            background: isHovered ? 'rgba(10, 16, 30, 0.85)' : 'rgba(10, 16, 30, 0.60)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: `1px solid ${colorHex}44`,
            borderRadius: '9999px',
            padding: '2px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: isHovered ? `0 0 12px ${colorHex}55` : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: colorHex,
              boxShadow: `0 0 6px ${colorHex}`,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            {constellation.name}
          </span>
        </div>

        {isHovered && (
          <span
            style={{
              fontSize: '10px',
              color: colorHex,
              fontWeight: 600,
              marginTop: '2px',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {constellation.english}
          </span>
        )}
      </div>
    </Html>
  );
};

interface DsoMarkerItemProps {
  dso: DeepSkyObject;
  radius: number;
}

const DsoMarkerItem: FC<DsoMarkerItemProps> = ({ dso, radius }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const position = useMemo(() => {
    return dsoToCartesian(dso.raHours, dso.decDeg, radius);
  }, [dso.raHours, dso.decDeg, radius]);

  return (
    <Html
      position={position}
      center
      zIndexRange={[25, 5]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        {/* Clickable Badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={`Click to explore ${dso.commonName}`}
          style={{
            background: isOpen
              ? 'rgba(15, 23, 42, 0.95)'
              : isHovered
              ? 'rgba(15, 23, 42, 0.85)'
              : 'rgba(8, 14, 28, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1.5px solid ${dso.colorHex}${isOpen || isHovered ? 'cc' : '66'}`,
            borderRadius: '9999px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: isOpen || isHovered ? `0 0 14px ${dso.colorHex}66` : '0 2px 6px rgba(0,0,0,0.4)',
            transform: isHovered || isOpen ? 'scale(1.08)' : 'scale(1.0)',
            transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '12px', lineHeight: 1 }}>{dso.iconEmoji}</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.3px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {dso.catalogNumber.split(' ')[0]}
          </span>
          <span style={{ fontSize: '10px', color: dso.colorHex, fontWeight: 600 }}>
            {dso.commonName}
          </span>
        </button>

        {/* Expanded Educational Deep-Sky Card */}
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '28px',
              width: '260px',
              background: 'rgba(10, 16, 32, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${dso.colorHex}66`,
              borderRadius: '16px',
              padding: '12px 14px',
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.8), 0 0 24px ${dso.colorHex}33`,
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              zIndex: 30,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{dso.iconEmoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    {dso.commonName}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                  {dso.catalogNumber} • in {dso.constellation}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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
                  fontSize: '11px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Category</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: dso.colorHex, textTransform: 'capitalize' }}>
                  {dso.category.replace('_', ' ')}
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Distance</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                  {dso.distanceLy >= 1000000
                    ? `${(dso.distanceLy / 1000000).toFixed(1)}M ly`
                    : `${dso.distanceLy.toLocaleString()} ly`}
                </div>
              </div>
            </div>

            {/* Educational Description */}
            <p style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.45, color: '#cbd5e1' }}>
              {dso.description}
            </p>
          </div>
        )}
      </div>
    </Html>
  );
};

export const CelestialMarkers: FC = () => {
  const showConstellationNames = useSkyStore((state) => state.showConstellationNames);
  const showDeepSkyObjects = useSkyStore((state) => state.showDeepSkyObjects);

  const constellationRadius = 24500;
  const dsoRadius = 24200;

  return (
    <group>
      {/* 1. Constellation Names & Centroids */}
      {showConstellationNames &&
        CONSTELLATIONS.map((c) => (
          <ConstellationLabelItem
            key={`constellation-label-${c.id}`}
            constellation={c}
            radius={constellationRadius}
          />
        ))}

      {/* 2. Deep Sky Objects (Galaxies, Nebulae, Clusters) */}
      {showDeepSkyObjects &&
        DEEP_SKY_OBJECTS.map((dso) => (
          <DsoMarkerItem
            key={`dso-marker-${dso.id}`}
            dso={dso}
            radius={dsoRadius}
          />
        ))}
    </group>
  );
};
