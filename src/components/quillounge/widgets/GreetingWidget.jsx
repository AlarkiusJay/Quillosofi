import { useEffect, useState } from 'react';
import { Edit3, Check } from 'lucide-react';
import { useUserName, getTimeGreeting } from '@/lib/userProfile';

export default function GreetingWidget() {
  const [name, setName] = useUserName();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const { greeting, period } = getTimeGreeting(now);
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const save = () => { setName(draft); setEditing(false); };

  const periodLabel = {
    morning: 'A fresh start',
    afternoon: 'Halfway through the day',
    evening: 'Wind-down hours',
    night: 'Late-night writing energy',
  }[period];

  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-[11px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold mb-1">{dateStr}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {greeting}{(name || editing) ? ',' : ''}
        </h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') { setDraft(name); setEditing(false); }
              }}
              placeholder="your name"
              className="text-2xl md:text-3xl font-bold text-white bg-transparent border-b-2 border-primary/60 outline-none w-44"
            />
            <button onClick={save} className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center"><Check className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(name); setEditing(true); }}
            className="group inline-flex items-center gap-2 text-2xl md:text-3xl font-bold text-white hover:text-primary transition-colors"
            title={name ? 'Click to change name' : 'Click to set your name'}
          >
            {name || <span className="italic text-[hsl(220,7%,50%)]">friend</span>}
            <Edit3 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
      <p className="text-xs text-[hsl(220,7%,55%)] mt-2">{periodLabel} — what are you working on?</p>
    </div>
  );
}
