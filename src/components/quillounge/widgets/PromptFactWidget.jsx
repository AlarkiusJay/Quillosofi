import { useEffect, useState } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { getTodaysPrompt } from '../widgets';

export default function PromptFactWidget() {
  const [data, setData] = useState(getTodaysPrompt);

  useEffect(() => {
    // Refresh once per minute around midnight, otherwise it's stable.
    const t = setInterval(() => setData(getTodaysPrompt()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3 w-3" style={{ color: 'hsl(var(--chalk-red))' }} />
          <p className="text-[10px] uppercase tracking-wider ink-muted font-semibold">Today's prompt</p>
        </div>
        <p className="text-sm ink-text leading-relaxed font-medium">"{data.prompt}"</p>
      </div>

      <div className="border-t border-ink-faint pt-3 mt-auto">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb className="h-3 w-3" style={{ color: 'hsl(var(--chalk-yellow))' }} />
          <p className="text-[10px] uppercase tracking-wider ink-muted font-semibold">Fun fact</p>
        </div>
        <p className="text-xs ink-text leading-relaxed">{data.fact}</p>
      </div>
    </div>
  );
}
