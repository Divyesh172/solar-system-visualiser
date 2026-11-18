import { useMemo, useState, type FC } from 'react';
import { Calendar, ArrowRight, X, ChevronDown } from 'lucide-react';
import { useSimulationClock } from '../../science/useSimulationClock';
import { getEclipseReport, type EclipseEvent } from '../../science/eclipse';
import { useFocusStore } from '../../state/useFocusStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { dateToJde } from '../../science/time';

const FAMOUS_ECLIPSES = [
  { name: 'Great American Eclipse', dateStr: '2024-04-08T18:17:00Z', type: 'Total Solar 🌑' },
  { name: 'Upcoming European Eclipse', dateStr: '2026-08-12T17:47:00Z', type: 'Total Solar 🌑' },
  { name: 'Great American Eclipse 2017', dateStr: '2017-08-21T18:26:00Z', type: 'Total Solar 🌑' },
  { name: 'Blood Moon Eclipse', dateStr: '2025-03-14T06:59:00Z', type: 'Total Lunar 🌕🔴' },
];

export const EclipseAlertBanner: FC = () => {
  const currentJde = useSimulationClock((state) => state.currentJde);
  const jumpToJde = useSimulationClock((state) => state.jumpToJde);
  const selectBody = useFocusStore((state) => state.selectBody);
  const isMobile = useIsMobile();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Re-calculate eclipse proximity when currentJde changes significantly (~0.1 days)
  const report = useMemo(() => {
    return getEclipseReport(currentJde);
  }, [Math.round(currentJde * 10)]);

  const targetEclipse: EclipseEvent | null = report.activeEclipse || report.upcomingEclipse;

  const handleJumpToPeak = (eclipse: EclipseEvent) => {
    jumpToJde(eclipse.peakJde);
    // Focus camera on Earth to observe the alignment
    selectBody({ id: 'earth', name: 'Earth', radius: 2.2, type: 'planet' });
  };

  const handleJumpToPreset = (dateIso: string) => {
    const jde = dateToJde(new Date(dateIso));
    jumpToJde(jde);
    selectBody({ id: 'earth', name: 'Earth', radius: 2.2, type: 'planet' });
    setShowPresets(false);
  };

  if (!targetEclipse && !showPresets) {
    return null;
  }

  if (isDismissed && !targetEclipse?.isActive) {
    return null;
  }

  const isActive = targetEclipse?.isActive ?? false;

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? '64px' : '20px',
        left: isMobile ? '10px' : '360px',
        right: isMobile ? '10px' : 'auto',
        zIndex: 45,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: isActive
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(15, 23, 42, 0.92))'
            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 0.88))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isActive
            ? '1.5px solid #f59e0b'
            : '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '18px',
          padding: isMobile ? '8px 12px' : '10px 16px',
          color: '#ffffff',
          boxShadow: isActive
            ? '0 0 25px rgba(245, 158, 11, 0.4), 0 8px 32px rgba(0, 0, 0, 0.55)'
            : '0 8px 30px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          animation: 'fadeIn 0.3s ease-out forwards',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Left: Icon & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: isMobile ? '18px' : '22px' }}>
              {targetEclipse?.emoji || '🌘'}
            </span>
            <div>
              <div
                style={{
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: 700,
                  color: isActive ? '#fef08a' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{targetEclipse?.label || 'Eclipse Watch'}</span>
                {isActive && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    LIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {isActive
                  ? 'Active Right Now! Sun, Moon & Earth aligned'
                  : targetEclipse
                  ? `Peaking in ${Math.ceil(targetEclipse.diffDays)} days (${targetEclipse.peakDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`
                  : 'Historical & Upcoming Eclipses'}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {targetEclipse && (
              <button
                onClick={() => handleJumpToPeak(targetEclipse)}
                title="Jump clock to peak eclipse alignment"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'rgba(56, 189, 248, 0.22)',
                  border: isActive ? 'none' : '1px solid rgba(56, 189, 248, 0.45)',
                  borderRadius: '12px',
                  padding: '5px 10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{isActive ? 'View Alignment' : 'Jump to Peak'}</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              onClick={() => setShowPresets(!showPresets)}
              title="Browse famous eclipses"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '12px',
                padding: '5px 8px',
                color: '#cbd5e1',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <Calendar size={13} />
              <ChevronDown size={11} />
            </button>

            {!isActive && (
              <button
                onClick={() => setIsDismissed(true)}
                title="Dismiss banner"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Famous Eclipses Quick Dropdown */}
        {showPresets && (
          <div
            style={{
              marginTop: '6px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
              Famous Solar & Lunar Eclipses:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
              {FAMOUS_ECLIPSES.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleJumpToPreset(item.dateStr)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#38bdf8', fontSize: '10px' }}>{item.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
