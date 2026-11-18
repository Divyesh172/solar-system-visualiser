import { useEffect, useState, type FC } from 'react';
import { Rocket, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useSpaceshipStore } from '../../state/useSpaceshipStore';

export const SpaceshipCockpitHUD: FC = () => {
  const isFlying = useSpaceshipStore((state) => state.isFlying);
  const destinationName = useSpaceshipStore((state) => state.destinationName);
  const destinationColor = useSpaceshipStore((state) => state.destinationColor);
  const arrivalNotice = useSpaceshipStore((state) => state.arrivalNotice);

  const [warpSpeed, setWarpSpeed] = useState(1.2);

  // Speedometer ticker during flight
  useEffect(() => {
    if (!isFlying) {
      setWarpSpeed(1.0);
      return;
    }
    const interval = setInterval(() => {
      setWarpSpeed((prev) => +(prev + 0.35 + Math.random() * 0.2).toFixed(1));
    }, 120);
    return () => clearInterval(interval);
  }, [isFlying]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 45,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 1. Cockpit Canopy Vignette & Flight Speed Lines */}
      {isFlying && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 100px rgba(56, 189, 248, 0.28), inset 0 0 40px rgba(0, 0, 0, 0.8)',
            border: '2px solid rgba(56, 189, 248, 0.18)',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        />
      )}

      {/* 2. Top-Center Warp Flight Banner */}
      {isFlying && (
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(8, 14, 28, 0.92), rgba(15, 23, 42, 0.92))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${destinationColor}88`,
            borderRadius: '24px',
            padding: '10px 24px',
            boxShadow: `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 30px ${destinationColor}44`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${destinationColor}, #38bdf8)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 12px ${destinationColor}`,
            }}
          >
            <Rocket size={18} color="#ffffff" />
          </span>

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#38bdf8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                }}
              />
              Warp Drive Active • Sublight Transit
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '1px' }}>
              Traveling to <span style={{ color: destinationColor }}>{destinationName}</span>
            </div>
          </div>

          <div
            style={{
              borderLeft: '1px solid rgba(255, 255, 255, 0.16)',
              paddingLeft: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Velocity
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#38bdf8',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              WARP {warpSpeed}
            </span>
          </div>
        </div>
      )}

      {/* 3. Flight Crosshair Reticle in Center */}
      {isFlying && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            border: '1px dashed rgba(56, 189, 248, 0.4)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              background: destinationColor,
              borderRadius: '50%',
              boxShadow: `0 0 10px ${destinationColor}`,
            }}
          />
        </div>
      )}

      {/* 4. Orbit Established Celebration Notification Banner */}
      {arrivalNotice && (
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.92), rgba(15, 23, 42, 0.92))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(74, 222, 128, 0.5)',
            borderRadius: '24px',
            padding: '10px 22px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(34, 197, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            animation: 'fadeIn 0.25s ease-out forwards',
          }}
        >
          <CheckCircle2 size={20} color="#4ade80" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
              {arrivalNotice}
            </div>
            <div style={{ fontSize: '11px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} /> Orbital insertion successful • Observation sensors active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
