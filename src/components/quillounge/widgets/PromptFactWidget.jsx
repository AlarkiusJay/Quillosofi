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
          <Sparkles className="h-3 w-3 text-rose-400" />
          <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold">Today's prompt</p>
        </div>
        <p className="text-sm text-white leading-relaxed font-medium">"{data.prompt}"</p>
      </div>

      <div className="border-t border-white/10 pt-3 mt-auto">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb className="h-3 w-3 text-amber-400" />
          <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold">Fun fact</p>
        </div>
        <p className="text-xs text-[hsl(220,14%,80%)] leading-relaxed">{data.fact}</p>
      </div>
    </div>
  );
}
