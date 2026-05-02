import { useState, useRef, useMemo } from 'react';
import { Sparkles, MessageSquare, Brain, Zap } from 'lucide-react';

// v0.4.23: welcome cards become sticky notes pinned to the chalkboard,
// matching Quillounge widgets. Each card gets a different paper color,
// thumbtack, and a deterministic small rotation so they look hand-pinned.
const suggestions = [
  { icon: MessageSquare, text: "Tell me about yourself",   desc: "Get to know your AI",          paper: 'var(--sticky-manila)',   rot: '-1.4deg' },
  { icon: Brain,         text: "Remember my preferences", desc: "Personalize your experience",  paper: 'var(--sticky-mint)',     rot: '0.8deg'  },
  { icon: Zap,           text: "Help me brainstorm ideas", desc: "Creative thinking partner",   paper: 'var(--sticky-pink)',     rot: '-0.6deg' },
];

// Hidden gag: hold the QF logo for ~5s (mouse) / ~2s (touch) and the app
// pops the rickroll out to the SYSTEM BROWSER. Quillosofi is a desktop app,
// so navigating with `location.href` (the previous behavior) was a bug — it
// loaded YouTube *inside* the Electron window, replacing the whole app UI
// with a guest YouTube page. Now uses window.quillosofi.openExternal to
// hand off to the OS default browser. Aligned to the same trap URL the
// (now-retired) Update tab prank used.
const TRAP_URL = 'https://www.youtube.com/watch?v=Aq5WXmQQooo';

function openTrap() {
  try {
    if (window.quillosofi?.openExternal) {
      window.quillosofi.openExternal(TRAP_URL);
      return;
    }
  } catch (_) { /* fall through to web fallback */ }
  // Web/dev fallback (no Electron preload bridge): new tab is the closest
  // we can get to "don't replace this page".
  try { window.open(TRAP_URL, '_blank', 'noopener,noreferrer'); } catch (_) {}
}


export default function EmptyState({ onSuggestionClick }) {
  const [holdProgress, setHoldProgress] = useState(0);
  const pressTimerRef = useRef(null);

  const startHold = (duration = 5000) => {
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        setTimeout(() => {
          openTrap();
          setHoldProgress(0);
        }, 100);
      } else {
        pressTimerRef.current = requestAnimationFrame(updateProgress);
      }
    };

    pressTimerRef.current = requestAnimationFrame(updateProgress);
  };

  const handleLogoMouseDown = () => startHold();

  const stopHold = () => {
    if (pressTimerRef.current) {
      cancelAnimationFrame(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const handleLogoMouseUp = () => stopHold();

  return (
    <div className="flex flex-col items-center justify-center h-full px-3 md:px-4 animate-fade-in overflow-y-auto">
      <div className="relative mb-3 md:mb-6 shrink-0">
        <div
          onMouseDown={handleLogoMouseDown}
          onMouseUp={handleLogoMouseUp}
          onMouseLeave={handleLogoMouseUp}
          onTouchStart={(e) => {e.preventDefault();startHold(2000);}}
          onTouchEnd={stopHold}
          onTouchCancel={stopHold}
          className="relative h-16 md:h-20 w-16 md:w-20 rounded-lg flex items-center justify-center cursor-pointer select-none">
          
          {holdProgress > 0 &&
          <div
            className="absolute inset-0 bg-white/20 border-2 border-white z-20"
            style={{ clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos(holdProgress * 2 * Math.PI - Math.PI / 2)}% ${50 + 50 * Math.sin(holdProgress * 2 * Math.PI - Math.PI / 2)}%)` }} />

          }
          <img src="./favicon.svg"

          alt="Quillosofi Logo" className="h-full w-full object-contain relative"

          style={{ filter: 'drop-shadow(0 0 12px rgba(20, 184, 166, 0.6))' }} />
          
        </div>
      </div>

      <h1 className="text-lg md:text-2xl font-bold chalk-text font-instrument mb-1 md:mb-2 tracking-tight text-center">Welcome to Quillosofi</h1>
      <p className="chalk-muted text-xs md:text-sm mb-2 md:mb-3 text-center max-w-md">
        Your Writing and Creative Companion. Built with Canvases, Custom Dictionary, and More!
      </p>
      <p className="text-[10px] md:text-xs mb-6 md:mb-10 text-center max-w-sm" style={{ color: 'hsl(var(--chalk-red) / 0.7)' }}>
        Quillosofi is still early in development — things may change, break, or improve over time.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full max-w-2xl shrink-0 px-2 md:px-4 pt-3">
        {suggestions.map((s, i) =>
          <button
            key={i}
            onClick={() => onSuggestionClick(s.text)}
            className="sticky-note group text-left p-3 md:p-4 pt-5 transition-all duration-200 hover:-translate-y-px"
            style={{ '--paper': s.paper, '--rot': s.rot, color: 'hsl(var(--sticky-ink))' }}>
            <span className="sticky-tack" aria-hidden="true" />
            <s.icon className="h-4 md:h-5 w-4 md:w-5 mb-1 md:mb-2" style={{ color: 'hsl(var(--sticky-ink) / 0.85)' }} />
            <p className="text-xs md:text-sm font-semibold ink-text">{s.text}</p>
            <p className="text-[10px] md:text-xs ink-muted mt-0.5">{s.desc}</p>
          </button>
        )}
      </div>
    </div>);

}