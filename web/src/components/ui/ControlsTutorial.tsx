import { useState, useEffect, type FC } from 'react';
import { X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTutorialStore } from '../../state/useTutorialStore';
import { useFocusStore } from '../../state/useFocusStore';
import { useSimulationClock } from '../../science/useSimulationClock';
import { useIsMobile } from '../../utils/useMediaQuery';
import { guideAudio } from '../../utils/guideAudio';

interface TutorialStep {
  title: string;
  badge: string;
  dialogue: string;
  highlightChip: string;
  targetSelector?: string;
  bubblePosition: 'top' | 'bottom';
  handPosition?: 'above' | 'left' | 'below';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Look Around the Cosmos! 🌌',
    badge: 'MISSION 1 OF 5',
    dialogue: 'Drag anywhere on your screen to orbit and pivot your view in 360°!',
    highlightChip: '↔️ Drag to Look',
    bubblePosition: 'top',
  },
  {
    title: 'Target Planet Earth! 🌍',
    badge: 'MISSION 2 OF 5',
    dialogue: 'Tap Earth in the dock below to engage starship warp drive!',
    highlightChip: '🌍 Tap Earth',
    targetSelector: '[data-tutorial="earth-button"]',
    bubblePosition: 'top',
    handPosition: 'above',
  },
  {
    title: 'Telescopic Zoom! 🔭',
    badge: 'MISSION 3 OF 5',
    dialogue: 'Tap (+) or roll your mouse wheel to inspect continents and clouds!',
    highlightChip: '🔍 Tap (+) to Zoom',
    targetSelector: '[data-tutorial="zoom-controls"]',
    bubblePosition: 'top',
    handPosition: 'left',
  },
  {
    title: 'Warp Speed Time Travel! ⏳',
    badge: 'MISSION 4 OF 5',
    dialogue: 'Tap "1 Day / sec" to watch the planets race along their orbits!',
    highlightChip: '⚡ 1 Day / sec',
    targetSelector: '[data-tutorial="time-controls"]',
    bubblePosition: 'bottom',
    handPosition: 'below',
  },
  {
    title: 'Ready for Launch! ⭐',
    badge: 'MISSION COMPLETE',
    dialogue: 'Outstanding, Commander! The entire Solar System is yours to explore.',
    highlightChip: '🚀 All Systems Go',
    targetSelector: '[data-tutorial="photo-button"]',
    bubblePosition: 'top',
    handPosition: 'above',
  },
];

export const ControlsTutorial: FC = () => {
  const isOpen = useTutorialStore((state) => state.isOpen);
  const activeStep = useTutorialStore((state) => state.activeSlide);
  const closeTutorial = useTutorialStore((state) => state.closeTutorial);
  const nextSlide = useTutorialStore((state) => state.nextSlide);
  const prevSlide = useTutorialStore((state) => state.prevSlide);
  const setSlide = useTutorialStore((state) => state.setSlide);
  const isMobile = useIsMobile();

  const selectedId = useFocusStore((state) => state.selectedId);
  const activePreset = useSimulationClock((state) => state.activePreset);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TUTORIAL_STEPS[Math.min(activeStep, TUTORIAL_STEPS.length - 1)];
  const isFinalStep = activeStep >= TUTORIAL_STEPS.length - 1;

  // Track target bounding rect for the spotlight and hand pointer
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      if (step.targetSelector) {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    const interval = setInterval(updateRect, 200);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isOpen, activeStep, step.targetSelector]);

  // Audio feedback on step transition
  useEffect(() => {
    if (!isOpen) return;
    if (isFinalStep) {
      guideAudio.playVictory();
    } else {
      guideAudio.playPop();
    }
  }, [isOpen, activeStep, isFinalStep]);

  // Auto-advance triggers:
  // Step 2: user selects Earth
  useEffect(() => {
    if (!isOpen) return;
    if (activeStep === 1 && selectedId === 'earth') {
      guideAudio.playActionDing();
      const t = setTimeout(() => nextSlide(), 600);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeStep, selectedId, nextSlide]);

  // Step 4: user activates time preset
  useEffect(() => {
    if (!isOpen) return;
    if (activeStep === 3 && activePreset === 'day_per_sec') {
      guideAudio.playActionDing();
      const t = setTimeout(() => nextSlide(), 700);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeStep, activePreset, nextSlide]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isFinalStep) {
      closeTutorial();
    } else {
      guideAudio.playPop();
      nextSlide();
    }
  };

  return (
    <>
      <style>{`
        /* Clash of Clans Animations */
        @keyframes cocHandTapDown {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(14px) scale(0.92, 0.96); }
          45% { transform: translateY(8px) scale(1); }
          75% { transform: translateY(0) scale(1); }
        }

        @keyframes cocHandTapRight {
          0%, 100% { transform: translateX(0) scale(1); }
          30% { transform: translateX(14px) scale(0.92, 0.96); }
          45% { transform: translateX(8px) scale(1); }
          75% { transform: translateX(0) scale(1); }
        }

        @keyframes cocHandTapUp {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-14px) scale(0.92, 0.96); }
          45% { transform: translateY(-8px) scale(1); }
          75% { transform: translateY(0) scale(1); }
        }

        @keyframes cocRipple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          40% { transform: translate(-50%, -50%) scale(1.8); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
        }

        @keyframes cocCanvasHandDrag {
          0%, 100% { transform: translateX(-50px) rotate(-12deg); opacity: 0.85; }
          50% { transform: translateX(50px) rotate(12deg); opacity: 1; }
        }

        @keyframes cocDialogEntrance {
          0% { transform: translate(-50%, -15px) scale(0.95); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        @keyframes cocSpotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.68), 0 0 25px rgba(250, 204, 21, 0.7); }
          50% { box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.74), 0 0 38px rgba(250, 204, 21, 0.95); }
        }
      `}</style>

      {/* =================================================================== */}
      {/* 1. CLASH OF CLANS SPOTLIGHT MASK (Dimmed screen + cutout)           */}
      {/* =================================================================== */}
      {targetRect ? (
        <div
          style={{
            position: 'fixed',
            left: `${targetRect.left - 6}px`,
            top: `${targetRect.top - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: '16px',
            border: '3px solid #facc15',
            animation: 'cocSpotlightPulse 2s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 88,
          }}
        />
      ) : (
        /* Full Dimmed Backdrop for general steps (Step 1) */
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.55)',
            pointerEvents: 'none',
            zIndex: 88,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* =================================================================== */}
      {/* 2. THE ANIMATED TAPPING HAND & CONTACT RIPPLE (Clash of Clans)      */}
      {/* =================================================================== */}
      {targetRect && step.handPosition === 'above' && (
        <div
          style={{
            position: 'fixed',
            left: `${targetRect.left + targetRect.width / 2}px`,
            top: `${targetRect.top - 10}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Animated White Cartoon Glove Hand pointing DOWN */}
          <div
            style={{
              animation: 'cocHandTapDown 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite',
              position: 'relative',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))',
            }}
          >
            <svg width="60" height="64" viewBox="0 0 60 64" fill="none">
              {/* White Cartoon Glove with Black Contour */}
              {/* Cuff */}
              <rect x="18" y="2" width="24" height="8" rx="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2.5" />
              {/* Palm */}
              <path
                d="M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              {/* Pointing Index Finger */}
              <path
                d="M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Glove crease lines */}
              <path d="M22 20V28" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              <path d="M30 20V28" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              <path d="M38 20V28" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            </svg>

            {/* Ripple Wave at fingertip */}
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid #facc15',
                background: 'rgba(250, 204, 21, 0.35)',
                animation: 'cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      )}

      {targetRect && step.handPosition === 'left' && (
        <div
          style={{
            position: 'fixed',
            left: `${targetRect.left - 15}px`,
            top: `${targetRect.top + targetRect.height / 2}px`,
            transform: 'translate(-100%, -50%)',
            pointerEvents: 'none',
            zIndex: 96,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Animated Cartoon Hand pointing RIGHT */}
          <div
            style={{
              animation: 'cocHandTapRight 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite',
              position: 'relative',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))',
              transform: 'rotate(-90deg)',
            }}
          >
            <svg width="60" height="64" viewBox="0 0 60 64" fill="none">
              <rect x="18" y="2" width="24" height="8" rx="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2.5" />
              <path
                d="M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              <path
                d="M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid #facc15',
                background: 'rgba(250, 204, 21, 0.35)',
                animation: 'cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      )}

      {targetRect && step.handPosition === 'below' && (
        <div
          style={{
            position: 'fixed',
            left: `${targetRect.left + targetRect.width / 2}px`,
            top: `${targetRect.bottom + 10}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: 'none',
            zIndex: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Animated Cartoon Hand pointing UP */}
          <div
            style={{
              animation: 'cocHandTapUp 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite',
              position: 'relative',
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))',
              transform: 'rotate(180deg)',
            }}
          >
            <svg width="60" height="64" viewBox="0 0 60 64" fill="none">
              <rect x="18" y="2" width="24" height="8" rx="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2.5" />
              <path
                d="M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              <path
                d="M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid #facc15',
                background: 'rgba(250, 204, 21, 0.35)',
                animation: 'cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Step 1: Center Drag Gesture Cue */}
      {activeStep === 0 && (
        <div
          style={{
            position: 'fixed',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              fontSize: '56px',
              animation: 'cocCanvasHandDrag 2s ease-in-out infinite',
              filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.9))',
            }}
          >
            👆
          </div>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px solid #38bdf8',
              borderRadius: '24px',
              padding: '6px 20px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
            }}
          >
            Click & Drag anywhere in space
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. DYNAMIC OPPOSING-QUADRANT DIALOGUE BANNER (Clash of Clans)       */}
      {/* =================================================================== */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: step.bubblePosition === 'top' ? (isMobile ? '8px' : '28px') : 'auto',
          bottom: step.bubblePosition === 'bottom' ? (isMobile ? '80px' : '96px') : 'auto',
          transform: 'translateX(-50%)',
          zIndex: 98,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '16px',
          width: isMobile ? 'calc(100vw - 16px)' : '90%',
          maxWidth: '560px',
          animation: 'cocDialogEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Officer Nova Guide Avatar */}
        <div
          style={{
            position: 'relative',
            width: isMobile ? '64px' : '84px',
            height: isMobile ? '64px' : '84px',
            flexShrink: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #818cf8 100%)',
            border: isMobile ? '3px solid #facc15' : '4px solid #facc15',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(250, 204, 21, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <svg width={isMobile ? '56' : '76'} height={isMobile ? '56' : '76'} viewBox="0 0 100 100" fill="none">
            <path d="M20 90C20 74 34 68 50 68C66 68 80 74 80 90H20Z" fill="#1e293b" />
            <path d="M30 90C30 78 40 73 50 73C60 73 70 78 70 90H30Z" fill="#334155" />
            <circle cx="50" cy="82" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1.5" />
            <circle cx="50" cy="46" r="32" fill="#e2e8f0" stroke="#0f172a" strokeWidth="3" />
            <ellipse cx="50" cy="47" rx="24" ry="20" fill="url(#cocVisorGrad)" stroke="#713f12" strokeWidth="2.5" />
            <circle cx="42" cy="45" r="3.2" fill="#1e1b4b" />
            <circle cx="58" cy="45" r="3.2" fill="#1e1b4b" />
            <path d="M44 54C47 58 53 58 56 54" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="37" cy="51" rx="3.5" ry="2" fill="#f43f5e" opacity="0.6" />
            <ellipse cx="63" cy="51" rx="3.5" ry="2" fill="#f43f5e" opacity="0.6" />
            <path d="M34 36C40 32 60 32 66 36" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
            <circle cx="64" cy="38" r="2" fill="#ffffff" />
            <circle cx="50" cy="12" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
            <line x1="50" y1="16" x2="50" y2="10" stroke="#0f172a" strokeWidth="2.5" />
            <defs>
              <linearGradient id="cocVisorGrad" x1="50" y1="27" x2="50" y2="67" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.6" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#b45309" />
              </linearGradient>
            </defs>
          </svg>
          {/* Green Online Status Pip */}
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
        </div>

        {/* Comic Speech Bubble (Warm Parchment CoC Aesthetics) */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #fffef9 0%, #fef3c7 100%)',
            border: isMobile ? '2.5px solid #78350f' : '3.5px solid #78350f',
            borderRadius: isMobile ? '18px' : '22px',
            padding: isMobile ? '10px 14px' : '14px 18px',
            boxShadow: '0 16px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(250, 204, 21, 0.35)',
            flex: 1,
            color: '#1e293b',
          }}
        >
          {/* Triangular Pointer Tail pointing to Nova */}
          <div
            style={{
              position: 'absolute',
              left: '-14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderRight: '14px solid #78350f',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-9px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderRight: '10px solid #fffef9',
            }}
          />

          {/* Top Bar: Officer Nova + Badge + Close Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: '#78350f',
                  letterSpacing: '0.2px',
                }}
              >
                Officer Nova
              </span>
              <span
                style={{
                  background: '#fef08a',
                  border: '1.5px solid #ca8a04',
                  borderRadius: '10px',
                  padding: '1px 8px',
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#854d0e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {step.badge}
              </span>
            </div>

            <button
              onClick={closeTutorial}
              title="Skip Tutorial"
              style={{
                background: 'rgba(120, 53, 15, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#78350f',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(120, 53, 15, 0.08)';
                e.currentTarget.style.color = '#78350f';
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Punchy 1-Sentence Directive (Show, Don't Tell) */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              lineHeight: '1.35',
              color: '#0f172a',
              marginBottom: '10px',
            }}
          >
            {step.dialogue}
          </div>

          {/* Action Row: Highlight Chip + Dots + Next Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            {/* Target Action Chip */}
            <div
              style={{
                background: '#e0f2fe',
                border: '1.5px solid #38bdf8',
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#0369a1',
              }}
            >
              {step.highlightChip}
            </div>

            {/* Stepper Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlide(idx)}
                  style={{
                    width: idx === activeStep ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === activeStep ? '#d97706' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            {/* Next / Finish Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeStep > 0 && !isFinalStep && (
                <button
                  onClick={prevSlide}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  Back
                </button>
              )}

              <button
                onClick={handleNext}
                style={{
                  background: isFinalStep
                    ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  border: '2px solid #78350f',
                  borderRadius: '16px',
                  padding: '6px 14px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1.0)';
                }}
              >
                {isFinalStep ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Let's Explore! 🚀</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
