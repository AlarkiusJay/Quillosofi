/*
 * StatsPanel — right-rail stats / clock / fonts.
 *
 * v0.4.46 — The Pure Writing Refactor: removed Library tab, Plugins tab,
 * AI quick-toggle row, AiSettingsModal mount, the conversations stat,
 * and the Recent Chats list. The panel now reflects writing activity:
 * canvas count, sheet count, spaces summary, and an optional list of
 * recent canvases when the consumer passes them in.
 */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import UpgradeModal from './UpgradeModal';
import { Folder, X, BarChart2, FileText, Table2 } from 'lucide-react';
import FontSelector from './FontSelector';
import { app } from '@/api/localClient';
import { guestStorage } from '../utils/guestStorage';
import { cn } from '@/lib/utils';

function LiveClock({ onShowHydrationModal }) {
  const [now, setNow] = useState(new Date());
  const [clockClicks, setClockClicks] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClockClick = () => {
    const newClicks = clockClicks + 1;
    setClockClicks(newClicks);
    if (newClicks % 2 === 0) {
      onShowHydrationModal();
    }
  };

  return (
    <div
      onClick={handleClockClick}
      className="rounded-xl p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: 'hsl(var(--chalk-board-alt) / 0.55)', backdropFilter: 'blur(2px)' }}
    >
      <p className="text-2xl font-mono font-bold text-white tracking-widest">
        {format(now, 'HH:mm:ss')}
      </p>
      <p className="text-[11px] text-[hsl(220,7%,50%)] mt-1 font-medium">
        {format(now, 'EEEE, MMM d yyyy')}
      </p>
    </div>
  );
}

export default function StatsPanel({ spaces = [], onClose, onShowHydrationModal }) {
  const [tab, setTab] = useState('stats');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [canvasCount, setCanvasCount] = useState(0);
  const [sheetCount, setSheetCount] = useState(0);
  const [recentCanvases, setRecentCanvases] = useState([]);

  const totalSpaces = spaces.length;

  // Pull canvas + sheet counts in parallel. Falls back to guest storage when
  // the user isn't signed in. Light query — capped to 5 recent canvases.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const isAuthed = await app.auth.isAuthenticated();
        if (!isAuthed) {
          const canvases = guestStorage.getCanvases?.() || [];
          const sheets = guestStorage.getSpreadsheets?.() || [];
          if (!cancelled) {
            setCanvasCount(canvases.length);
            setSheetCount(sheets.length);
            setRecentCanvases(canvases.slice(0, 5));
          }
          return;
        }
        const [canvases, sheets] = await Promise.all([
          app.entities.Canvas.list('-updated_date', 5),
          app.entities.Spreadsheet.list('-updated_date', 1),
        ]);
        if (!cancelled) {
          setRecentCanvases(canvases || []);
          // Counts: we only fetched 5 / 1 above for the recent list, so issue a
          // separate quick filter for true totals.
          const allCanvases = await app.entities.Canvas.list('-updated_date', 500);
          const allSheets = await app.entities.Spreadsheet.list('-updated_date', 500);
          if (!cancelled) {
            setCanvasCount(allCanvases.length);
            setSheetCount(allSheets.length);
          }
        }
      } catch {
        // Stats panel is decorative; swallow errors silently.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-full flex flex-col w-full md:w-64 shrink-0" style={{ background: 'transparent', borderLeft: '1px solid hsl(var(--chalk-white-faint) / 0.3)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-black/30 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => setTab('stats')} className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors',
            tab === 'stats' ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white'
          )}>
            <BarChart2 className="h-3.5 w-3.5" /> Stats
          </button>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] transition-colors md:hidden text-[hsl(220,7%,65%)] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto", tab !== 'stats' && 'hidden')}>
        <FontSelector />
        <div className="py-4 px-3 space-y-4">

          {/* Clock */}
          <LiveClock onShowHydrationModal={onShowHydrationModal} />

          {/* Summary cards — Canvases / Sheets / Spaces */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-3" style={{ background: 'hsl(var(--chalk-board-alt) / 0.55)', backdropFilter: 'blur(2px)' }}>
              <FileText className="h-4 w-4 text-primary mb-1" />
              <p className="text-xl font-bold text-white">{canvasCount}</p>
              <p className="text-[10px] text-[hsl(220,7%,50%)] font-medium">Canvases</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'hsl(var(--chalk-board-alt) / 0.55)', backdropFilter: 'blur(2px)' }}>
              <Table2 className="h-4 w-4 text-primary mb-1" />
              <p className="text-xl font-bold text-white">{sheetCount}</p>
              <p className="text-[10px] text-[hsl(220,7%,50%)] font-medium">Sheets</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'hsl(var(--chalk-board-alt) / 0.55)', backdropFilter: 'blur(2px)' }}>
              <Folder className="h-4 w-4 text-primary mb-1" />
              <p className="text-xl font-bold text-white">{totalSpaces}</p>
              <p className="text-[10px] text-[hsl(220,7%,50%)] font-medium">Spaces</p>
            </div>
          </div>

          {/* Spaces */}
          {spaces.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-2 px-1">Spaces</p>
              <div className="space-y-1">
                {spaces.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(220,7%,65%)]"
                  >
                    <span className="text-base leading-none">{s.emoji || '📁'}</span>
                    <span className="truncate flex-1">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent canvases — replaces Recent Chats */}
          {recentCanvases.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-2 px-1">Recent canvases</p>
              <div className="space-y-1">
                {recentCanvases.map(c => (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 px-2 py-1.5 rounded text-sm text-[hsl(220,7%,65%)]"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs">{c.title || 'Untitled canvas'}</p>
                      {c.updated_date && (
                        <p className="text-[10px] text-[hsl(220,7%,40%)]">
                          {format(new Date(c.updated_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentCanvases.length === 0 && spaces.length === 0 && (
            <p className="text-xs text-[hsl(220,7%,45%)] text-center py-8">No history yet</p>
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
