import { useState, useEffect, type FC } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, RotateCcw } from 'lucide-react';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useIsMobile } from '../../utils/useMediaQuery';
import { dateToJde, jdeToDate } from '../../science/time';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const SPACE_MILESTONES = [
  { label: '🌕 Apollo 11 Moon Landing', date: new Date(Date.UTC(1969, 6, 20, 20, 17)) },
  { label: '🪐 Voyager 1 at Jupiter', date: new Date(Date.UTC(1979, 2, 5, 12, 0)) },
  { label: '❄️ New Horizons at Pluto', date: new Date(Date.UTC(2015, 6, 14, 11, 49)) },
  { label: '🔭 James Webb Launch', date: new Date(Date.UTC(2021, 11, 25, 12, 20)) },
  { label: '🔴 Perseverance Lands on Mars', date: new Date(Date.UTC(2021, 1, 18, 20, 55)) },
];

interface CalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarPicker: FC<CalendarPickerProps> = ({ isOpen, onClose }) => {
  const currentJde = useSimulationClock((state) => state.currentJde);
  const jumpToJde = useSimulationClock((state) => state.jumpToJde);
  const resetToToday = useSimulationClock((state) => state.resetToToday);
  const isMobile = useIsMobile();

  const currentDate = jdeToDate(currentJde);
  const simYear = currentDate.getUTCFullYear();
  const simMonth = currentDate.getUTCMonth();
  const simDay = currentDate.getUTCDate();

  const [viewYear, setViewYear] = useState(simYear);
  const [viewMonth, setViewMonth] = useState(simMonth);

  // Sync view when opened
  useEffect(() => {
    if (isOpen) {
      setViewYear(simYear);
      setViewMonth(simMonth);
    }
  }, [isOpen, simYear, simMonth]);

  if (!isOpen) return null;

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar calculations
  // First day of month (Monday = 0 ... Sunday = 6)
  const firstDayOfWeek = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  const handleSelectDay = (day: number) => {
    const newDate = new Date(Date.UTC(viewYear, viewMonth, day, 12, 0, 0));
    jumpToJde(dateToJde(newDate));
  };

  const handleAdjustDays = (deltaDays: number) => {
    const d = jdeToDate(currentJde);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    jumpToJde(dateToJde(d));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  };

  const handleAdjustYears = (deltaYears: number) => {
    const d = jdeToDate(currentJde);
    d.setUTCFullYear(d.getUTCFullYear() + deltaYears);
    jumpToJde(dateToJde(d));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  };

  // ISO date string for native HTML5 picker (YYYY-MM-DD)
  const isoDate = `${simYear.toString().padStart(4, '0')}-${(simMonth + 1)
    .toString()
    .padStart(2, '0')}-${simDay.toString().padStart(2, '0')}`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: isMobile ? '48px' : '64px',
        left: isMobile ? '50%' : '0',
        transform: isMobile ? 'translateX(-50%)' : 'none',
        zIndex: 60,
        width: isMobile ? 'calc(100vw - 24px)' : '350px',
        maxWidth: isMobile ? '360px' : 'calc(100vw - 32px)',
        background: 'rgba(10, 16, 30, 0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '24px',
        padding: isMobile ? '16px' : '20px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 35px rgba(56, 189, 248, 0.25)',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. Header with Title & Close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={18} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            Adjust Date & Time
          </h3>
        </div>

        <button
          onClick={onClose}
          title="Close Calendar"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. Month & Year Stepper Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '6px 10px',
          marginBottom: '14px',
        }}
      >
        <button
          onClick={prevMonth}
          title="Previous Month"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc', display: 'flex', gap: '6px' }}>
          <span>{MONTH_NAMES[viewMonth]}</span>
          <span style={{ color: '#38bdf8' }}>{viewYear}</span>
        </div>

        <button
          onClick={nextMonth}
          title="Next Month"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 3. Weekday Labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 600,
          color: '#94a3b8',
          marginBottom: '8px',
        }}
      >
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* 4. Calendar Days Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '16px',
        }}
      >
        {/* Leading empty slots */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} style={{ height: '32px' }} />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const isSelected = viewYear === simYear && viewMonth === simMonth && dayNum === simDay;

          return (
            <button
              key={`day-${dayNum}`}
              onClick={() => handleSelectDay(dayNum)}
              style={{
                height: '32px',
                borderRadius: '8px',
                border: isSelected ? '1px solid #38bdf8' : 'none',
                background: isSelected
                  ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? '#ffffff' : '#e2e8f0',
                fontSize: '13px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.6)' : 'none',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* 5. Direct Date Input & Quick Steppers */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
          Quick Jump / Direct Date:
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="date"
            value={isoDate}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split('-').map(Number);
              const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
              jumpToJde(dateToJde(target));
              setViewYear(y);
              setViewMonth(m - 1);
            }}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '10px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          />

          <button
            onClick={() => {
              resetToToday();
              const now = new Date();
              setViewYear(now.getUTCFullYear());
              setViewMonth(now.getUTCMonth());
            }}
            title="Reset to Today"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={12} /> Today
          </button>
        </div>
      </div>

      {/* Quick Stepper Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
        <button
          onClick={() => handleAdjustDays(-1)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '5px 0',
            color: '#e2e8f0',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          -1 Day
        </button>
        <button
          onClick={() => handleAdjustDays(1)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '5px 0',
            color: '#e2e8f0',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          +1 Day
        </button>
        <button
          onClick={() => handleAdjustYears(-1)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '5px 0',
            color: '#e2e8f0',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          -1 Year
        </button>
        <button
          onClick={() => handleAdjustYears(1)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '5px 0',
            color: '#e2e8f0',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          +1 Year
        </button>
      </div>

      {/* 6. Famous Space Milestones */}
      <div>
        <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <Sparkles size={12} /> Famous Space Milestones:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {SPACE_MILESTONES.map((m) => (
            <button
              key={m.label}
              onClick={() => {
                jumpToJde(dateToJde(m.date));
                setViewYear(m.date.getUTCFullYear());
                setViewMonth(m.date.getUTCMonth());
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#cbd5e1',
                fontSize: '11.5px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
