import { useState, type FC } from 'react';
import { Play, Pause, RotateCcw, FastForward, Calendar, Clock, Camera, Gamepad2, Compass } from 'lucide-react';
import { useSimulationClock } from '../../science/useSimulationClock';
import { formatJde, TIME_SPEED_LABELS, type TimeSpeedPreset } from '../../science/time';
import { captureSnapshot } from '../../utils/captureSnapshot';
import { CalendarPicker } from './CalendarPicker';
import { useTutorialStore } from '../../state/useTutorialStore';
import { useTourStore } from '../../state/useTourStore';
import { useIsMobile } from '../../utils/useMediaQuery';

const PRESETS: TimeSpeedPreset[] = [
  'hour_per_sec',
  'day_per_sec',
  'week_per_sec',
  'month_per_sec',
  'year_per_sec',
];

/**
 * TimeScrubber: NASA Eyes-style astronomical time control toolbar.
 * 
 * Features:
 * - Gregorian calendar date display synchronized with real-time ephemeris
 * - Play/Pause and Reverse time flow (-1x)
 * - Warp speed presets (1 Hr/s to 1 Yr/s)
 * - Quick-jump button to reset directly to Today
 */
export const TimeScrubber: FC = () => {
  const currentJde = useSimulationClock((state) => state.currentJde);
  const isPaused = useSimulationClock((state) => state.isPaused);
  const direction = useSimulationClock((state) => state.direction);
  const activePreset = useSimulationClock((state) => state.activePreset);

  const togglePause = useSimulationClock((state) => state.togglePause);
  const reverseDirection = useSimulationClock((state) => state.reverseDirection);
  const setSpeedPreset = useSimulationClock((state) => state.setSpeedPreset);
  const resetToToday = useSimulationClock((state) => state.resetToToday);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const isMobile = useIsMobile();

  const formattedDate = formatJde(currentJde);

  // =========================================================================
  // 1. MOBILE ULTRA-SLEEK SINGLE FLOATING BAR (40px height, 100% canvas view!)
  // =========================================================================
  if (isMobile) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          zIndex: 40,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            background: 'rgba(10, 16, 30, 0.90)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '24px',
            padding: '4px 8px 4px 10px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
            color: '#ffffff',
            width: '100%',
          }}
        >
          {/* Date Trigger */}
          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            title="Click to adjust date"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: '12px',
              background: isCalendarOpen ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              flexShrink: 0,
            }}
          >
            <Calendar size={14} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              {formattedDate}
            </span>
            <span style={{ fontSize: '8px', color: '#38bdf8', opacity: 0.8 }}>
              {isCalendarOpen ? '▲' : '▼'}
            </span>
          </div>

          {/* Play/Pause & Speed Preset Cycle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '2px 4px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              onClick={togglePause}
              title={isPaused ? 'Play' : 'Pause'}
              style={{
                background: isPaused ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.25)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPaused ? '#22c55e' : '#38bdf8',
                cursor: 'pointer',
              }}
            >
              {isPaused ? <Play size={11} fill="currentColor" /> : <Pause size={11} fill="currentColor" />}
            </button>

            <button
              data-tutorial="time-controls"
              onClick={() => {
                const idx = PRESETS.indexOf(activePreset);
                const nextPreset = PRESETS[(idx + 1) % PRESETS.length];
                setSpeedPreset(nextPreset);
              }}
              title="Tap to cycle simulation warp speed"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '2px 5px',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <FastForward size={10} />
              {activePreset === 'hour_per_sec'
                ? '1h/s'
                : activePreset === 'day_per_sec'
                ? '1d/s'
                : activePreset === 'week_per_sec'
                ? '1w/s'
                : activePreset === 'month_per_sec'
                ? '1m/s'
                : '1y/s'}
            </button>
          </div>

          {/* Action Group: Tour, Photo, Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={() => useTourStore.getState().startTour()}
              title="Start Guided Tour"
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '12px',
                padding: '4px 7px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Compass size={12} color="#38bdf8" /> Tour
            </button>

            <button
              onClick={() => captureSnapshot()}
              title="Take Photo"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                cursor: 'pointer',
              }}
            >
              <Camera size={13} />
            </button>

            <button
              onClick={() => useTutorialStore.getState().openTutorial()}
              title="Guide"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                cursor: 'pointer',
              }}
            >
              <Gamepad2 size={13} />
            </button>
          </div>
        </div>

        {/* Dropdown Calendar Picker */}
        <CalendarPicker
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. DESKTOP FULL-SIZE TIME SCRUBBER (Two rows on top-left)
  // =========================================================================
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Date & Time Display Badge (Clickable to open Calendar) */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(10, 16, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isCalendarOpen
              ? '1px solid #38bdf8'
              : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '16px',
            padding: '8px 16px',
            boxShadow: isCalendarOpen
              ? '0 0 20px rgba(56, 189, 248, 0.35), 0 8px 32px rgba(0, 0, 0, 0.45)'
              : '0 8px 32px rgba(0, 0, 0, 0.45)',
            color: '#ffffff',
            width: 'fit-content',
            transition: 'all 0.15s ease',
          }}
        >
          {/* Clickable Date Area */}
          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            title="Click to open Calendar and adjust dates"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                background: isCalendarOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <Calendar size={18} color="#38bdf8" />
            </span>
            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{formattedDate}</span>
                <span style={{ fontSize: '10px', color: '#38bdf8', opacity: 0.8 }}>
                  {isCalendarOpen ? '▲' : '▼'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} /> JDE {currentJde.toFixed(1)} {direction < 0 ? '• Reversing' : ''}
              </div>
            </div>
          </div>

          <button
            onClick={resetToToday}
            title="Jump to Today"
            style={{
              marginLeft: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              padding: '3px 8px',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
            }}
          >
            Today
          </button>

          <button
            onClick={() => captureSnapshot()}
            title="Take Photo & Share"
            style={{
              marginLeft: '4px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '10px',
              padding: '3px 9px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.35))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.0)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))';
            }}
          >
            <Camera size={13} color="#38bdf8" /> Photo
          </button>

          <button
            onClick={() => useTutorialStore.getState().openTutorial()}
            title="Flight Manual & Game Controls Guide"
            style={{
              marginLeft: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '10px',
              padding: '3px 9px',
              color: '#e2e8f0',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)';
              e.currentTarget.style.borderColor = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            }}
          >
            <Gamepad2 size={13} color="#38bdf8" /> Controls
          </button>
        </div>

        {/* Interactive Calendar Popover */}
        <CalendarPicker
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
        />
      </div>

      {/* 2. Playback & Warp Speed Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(10, 16, 30, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '16px',
          padding: '6px 10px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          color: '#ffffff',
          width: 'fit-content',
        }}
      >
        {/* Reverse Button */}
        <button
          onClick={reverseDirection}
          title="Reverse time direction"
          style={{
            background: direction < 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: direction < 0 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: direction < 0 ? '#ef4444' : '#cbd5e1',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePause}
          title={isPaused ? 'Play' : 'Pause'}
          style={{
            background: isPaused ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.25)',
            border: isPaused ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPaused ? '#22c55e' : '#38bdf8',
            cursor: 'pointer',
          }}
        >
          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.16)', margin: '0 4px' }} />

        {/* Speed Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset;
            const label = TIME_SPEED_LABELS[preset];
            return (
              <button
                key={preset}
                data-tutorial={preset === 'day_per_sec' ? 'time-controls' : undefined}
                onClick={() => setSpeedPreset(preset)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255, 255, 255, 0.05)',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  color: isActive ? '#38bdf8' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.15s ease-out',
                }}
              >
                {isActive && <FastForward size={10} />}
                {label.replace(' (Real Time)', '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
