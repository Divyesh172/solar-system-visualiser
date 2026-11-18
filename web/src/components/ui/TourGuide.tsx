import { useState, useEffect, useRef, type FC } from 'react';
import { Compass, ChevronRight, ChevronLeft, X, Play, Pause } from 'lucide-react';
import { useFocusStore } from '../../state/useFocusStore';
import { useTourStore } from '../../state/useTourStore';
import { useIsMobile } from '../../utils/useMediaQuery';
import { PLANETARY_METADATA } from '../../science/constants';
import type { PlanetKey } from '../../science/ephemeris';

interface TourStop {
  id: PlanetKey;
  title: string;
  subtitle: string;
  narration: string;
}

const TOUR_STOPS: TourStop[] = [
  {
    id: 'sun',
    title: 'The Blazing Sun',
    subtitle: 'The Heart of the Solar System',
    narration: 'We begin our journey at the Sun! A gigantic ball of glowing plasma that holds 99.8% of all matter in our entire solar neighborhood.',
  },
  {
    id: 'mercury',
    title: 'Mercury',
    subtitle: 'The Swift Iron World',
    narration: 'Speeding around the Sun in just 88 days! With virtually no atmosphere, its sunlit side scorches at 430 °C while its night drops to -180 °C.',
  },
  {
    id: 'venus',
    title: 'Venus',
    subtitle: 'The Superheated Twin',
    narration: 'Shrouded in thick sulfuric clouds trapping extreme heat! Venus rotates in reverse — the Sun rises in the west and sets in the east.',
  },
  {
    id: 'earth',
    title: 'Planet Earth',
    subtitle: 'The Blue Oasis of Life',
    narration: 'Our home! The only known world with liquid surface water, an oxygen-rich atmosphere, and millions of species of living wonders.',
  },
  {
    id: 'mars',
    title: 'Mars',
    subtitle: 'The Dusty Red Planet',
    narration: 'Colored red by rusty iron soil. Mars hosts Olympus Mons, a volcano three times taller than Mount Everest!',
  },
  {
    id: 'jupiter',
    title: 'Jupiter',
    subtitle: 'The King of the Planets',
    narration: 'A colossal gas giant over 1,300 times the volume of Earth! Its famous Great Red Spot is a swirling storm larger than our entire planet.',
  },
  {
    id: 'saturn',
    title: 'Saturn',
    subtitle: 'The Lord of the Rings',
    narration: 'Dazzling rings span over 280,000 km across, made of billions of shimmering ice crystals and rock chunks.',
  },
  {
    id: 'uranus',
    title: 'Uranus',
    subtitle: 'The Sideways Ice Giant',
    narration: 'Knocked completely onto its side by a colossal cosmic collision, Uranus rolls around the Sun like a cosmic bowling ball!',
  },
  {
    id: 'neptune',
    title: 'Neptune',
    subtitle: 'The Deep Cobalt World',
    narration: 'The most distant major planet! Its deep methane atmosphere roars with supersonic winds surpassing 2,000 kilometers per hour.',
  },
];

/**
 * TourGuide: Automated cinematic solar system guided spaceship expedition.
 */
export const TourGuide: FC = () => {
  const isOpen = useTourStore((state) => state.isOpen);
  const startTourStore = useTourStore((state) => state.startTour);
  const closeTourStore = useTourStore((state) => state.closeTour);
  const isMobile = useIsMobile();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(8);

  const selectBody = useFocusStore((state) => state.selectBody);
  const clearSelection = useFocusStore((state) => state.clearSelection);

  const timerRef = useRef<number | null>(null);

  const currentStop = TOUR_STOPS[currentIndex];

  // Initialize stop on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsAutoPlaying(true);
      setSecondsRemaining(8);
      const stop = TOUR_STOPS[0];
      const meta = PLANETARY_METADATA[stop.id];
      selectBody({
        id: stop.id,
        name: meta.name,
        radius: stop.id === 'sun' ? 4.2 : meta.earthRadiusRatio * (stop.id === 'jupiter' ? 0.35 : 1.0),
        type: stop.id === 'sun' ? 'star' : 'planet',
      });
    }
  }, [isOpen, selectBody]);

  // Fly to specific stop
  const goToStop = (index: number) => {
    const nextIdx = (index + TOUR_STOPS.length) % TOUR_STOPS.length;
    setCurrentIndex(nextIdx);
    setSecondsRemaining(8);

    const stop = TOUR_STOPS[nextIdx];
    const meta = PLANETARY_METADATA[stop.id];
    let radius = 2.0;
    if (stop.id === 'sun') radius = 4.2;
    else if (stop.id === 'mercury') radius = 0.85;
    else if (stop.id === 'venus') radius = 2.1;
    else if (stop.id === 'earth') radius = 2.2;
    else if (stop.id === 'mars') radius = 1.18;
    else if (stop.id === 'jupiter') radius = 3.8;
    else if (stop.id === 'saturn') radius = 3.2;
    else if (stop.id === 'uranus') radius = 2.4;
    else if (stop.id === 'neptune') radius = 2.3;

    selectBody({
      id: stop.id,
      name: meta.name,
      radius,
      type: stop.id === 'sun' ? 'star' : 'planet',
    });
  };

  const handleClose = () => {
    closeTourStore();
    clearSelection();
  };

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          goToStop(currentIndex + 1);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isAutoPlaying, currentIndex]);

  if (!isOpen) {
    if (isMobile) return null; // Mobile has unified top bar tour launcher

    return (
      <button
        onClick={startTourStore}
        title="Start Guided Solar System Tour"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 40,
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.35))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '24px',
          padding: '10px 18px',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(56, 189, 248, 0.35)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 36px rgba(168, 85, 247, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1.0)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(56, 189, 248, 0.35)';
        }}
      >
        <Compass size={16} color="#38bdf8" /> Start Guided Tour
      </button>
    );
  }

  const meta = PLANETARY_METADATA[currentStop.id];

  return (
    <div
      style={{
        position: isMobile ? 'fixed' : 'absolute',
        top: isMobile ? 'auto' : '20px',
        bottom: isMobile ? '16px' : 'auto',
        left: isMobile ? '16px' : 'auto',
        right: isMobile ? '16px' : '20px',
        width: isMobile ? 'auto' : '380px',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 'calc(100vw - 40px)',
        zIndex: 60,
        background: 'rgba(10, 16, 30, 0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: isMobile ? '20px' : '24px',
        padding: isMobile ? '16px 18px' : '24px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px ${meta.colorHex}33`,
        animation: isMobile
          ? 'slideUpBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          : 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Tour Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          <Compass size={14} /> Stop {currentIndex + 1} of {TOUR_STOPS.length}
        </div>

        <button
          onClick={handleClose}
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

      {/* Title & Subtitle */}
      <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700, color: meta.colorHex }}>
        {currentStop.title}
      </h3>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px' }}>
        {currentStop.subtitle}
      </div>

      {/* Narration Text */}
      <p style={{ margin: '0 0 20px 0', fontSize: '14px', lineHeight: 1.6, color: '#f1f5f9' }}>
        {currentStop.narration}
      </p>

      {/* Navigation & Auto-Play Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => goToStop(currentIndex - 1)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            style={{
              background: isAutoPlaying ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isAutoPlaying ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: isAutoPlaying ? '#38bdf8' : '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            {isAutoPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {isAutoPlaying ? `Next in ${secondsRemaining}s` : 'Paused'}
          </button>

          <button
            onClick={() => goToStop(currentIndex + 1)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '11px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Exit Tour
        </button>
      </div>
    </div>
  );
};
