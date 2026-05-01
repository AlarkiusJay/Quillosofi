import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Pin, Hash } from 'lucide-react';
import { app } from '@/api/localClient';

export default function PinnedRecentWidget() {
  const navigate = useNavigate();
  const [canvases, setCanvases] = useState([]);
  const [stats, setStats] = useState({ totalWords: 0, totalCanvases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await app.entities.Canvas.list('-updated_date', 50);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setCanvases(list);
        // word count from HTML — strip tags then count tokens
        const totalWords = list.reduce((sum, c) => {
          const text = (c.content || '').replace(/<[^>]+>/g, ' ').trim();
          return sum + (text ? text.split(/\s+/).length : 0);
        }, 0);
        setStats({ totalWords, totalCanvases: list.length });
      } catch (e) {
        if (!cancelled) setCanvases([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pinned = canvases.filter(c => c.is_pinned).slice(0, 3);
  const recent = canvases.filter(c => !c.is_pinned).slice(0, 4);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/25 border border-white/5 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold">Total words</p>
          <p className="text-lg font-semibold text-white tabular-nums">{stats.totalWords.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-black/25 border border-white/5 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold">Canvases</p>
          <p className="text-lg font-semibold text-white tabular-nums">{stats.totalCanvases}</p>
        </div>
      </div>

      {pinned.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold mb-1.5 flex items-center gap-1.5"><Pin className="h-2.5 w-2.5" />Pinned</p>
          <ul className="space-y-0.5">
            {pinned.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => navigate('/quillibrary')}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-black/30 transition-colors"
                >
                  <FileText className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[11px] text-white truncate">{c.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,55%)] font-semibold mb-1.5 flex items-center gap-1.5"><Hash className="h-2.5 w-2.5" />Recent</p>
        {recent.length === 0 ? (
          <p className="text-xs text-[hsl(220,7%,50%)]">Nothing yet — start writing.</p>
        ) : (
          <ul className="space-y-0.5">
            {recent.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => navigate('/quillibrary')}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-black/30 transition-colors"
                >
                  <FileText className="h-3 w-3 text-[hsl(220,7%,55%)] shrink-0" />
                  <span className="text-[11px] text-[hsl(220,14%,80%)] truncate">{c.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
