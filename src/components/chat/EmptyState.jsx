import { useState, useRef } from 'react';
import { Sparkles, MessageSquare, Brain, Zap } from 'lucide-react';

const suggestions = [
{ icon: MessageSquare, text: "Tell me about yourself", desc: "Get to know your AI" },
{ icon: Brain, text: "Remember my preferences", desc: "Personalize your experience" },
{ icon: Zap, text: "Help me brainstorm ideas", desc: "Creative thinking partner" }];


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
          location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
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

      <h1 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2 tracking-tight text-center">Welcome to Quillosofi</h1>
      <p className="text-[hsl(220,7%,55%)] text-xs md:text-sm mb-2 md:mb-3 text-center max-w-md">
        Your Writing and Creative Companion. Built with Canvases, Custom Dictionary, and More!
      </p>
      <p className="text-red-400/50 text-[10px] md:text-xs mb-4 md:mb-8 text-center max-w-sm">
        Quillosofi is still early in development — things may change, break, or improve over time.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 w-full max-w-2xl shrink-0">
        {suggestions.map((s, i) =>
        <button
          key={i}
          onClick={() => onSuggestionClick(s.text)}
          className="group text-left p-2.5 md:p-4 rounded-lg border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,18%)] hover:bg-[hsl(228,7%,24%)] hover:border-primary/30 transition-all duration-200">
          
            <s.icon className="h-4 md:h-5 w-4 md:w-5 text-[hsl(235,86%,65%)] mb-1 md:mb-2" />
            <p className="text-xs md:text-sm font-medium text-white">{s.text}</p>
            <p className="text-[10px] md:text-xs text-[hsl(220,7%,50%)] mt-0.5">{s.desc}</p>
          </button>
        )}
      </div>
    </div>);

}