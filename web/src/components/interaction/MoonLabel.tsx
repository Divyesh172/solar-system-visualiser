import { useState, type FC } from 'react';
import { Html } from '@react-three/drei';
import { useFocusStore } from '../../state/useFocusStore';

interface MoonLabelProps {
  id: string;
  name: string;
  color?: string;
  radius: number;
}

export const MoonLabel: FC<MoonLabelProps> = ({ id, name, color = '#cbd5e1', radius }) => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const selectBody = useFocusStore((state) => state.selectBody);
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = selectedId === id;
  const isAnotherSelected = selectedId !== null && !isSelected;

  // Elevate above the moon sphere
  const yOffset = radius + 1.1;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      zIndexRange={[90, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: isAnotherSelected ? 0.45 : 0.85,
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
            selectBody({ id, name, radius, type: 'moon' });
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            pointerEvents: 'auto',
            background: isSelected
              ? 'rgba(15, 23, 42, 0.94)'
              : isHovered
              ? 'rgba(15, 23, 42, 0.88)'
              : 'rgba(8, 14, 26, 0.70)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: isSelected
              ? `1.5px solid ${color}`
              : isHovered
              ? `1.5px solid ${color}`
              : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '9999px',
            padding: '1.5px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: isSelected
              ? `0 0 12px ${color}88, 0 2px 8px rgba(0, 0, 0, 0.6)`
              : isHovered
              ? `0 0 8px ${color}55, 0 2px 6px rgba(0, 0, 0, 0.5)`
              : '0 2px 6px rgba(0, 0, 0, 0.4)',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            transform: isHovered ? 'scale(1.06)' : 'scale(1.0)',
            transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 4px ${color}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: '10px',
              letterSpacing: '0.2px',
              color: '#e2e8f0',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
            }}
          >
            {name}
          </span>
        </button>

        {/* Stem pointing down to moon */}
        <div
          style={{
            width: '1px',
            height: '6px',
            background: `linear-gradient(to bottom, ${color}88, ${color}15)`,
          }}
        />
        <div
          style={{
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            background: color,
            opacity: 0.6,
          }}
        />
      </div>
    </Html>
  );
};
