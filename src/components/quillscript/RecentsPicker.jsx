// RecentsPicker — v0.6.65-Alpha2
//
// Compact dropdown showing the last 8 canvases by `updated_date`. Lives
// next to the Quillginate toggle in the canvas header — only rendered
// when Quillginate is ON, because in Quillscript mode the sidebar already
// shows the full tree. The point: when you're deep in page-layout mode
// and want to hop to another canvas WITHOUT leaving Quillginate, this
// lets you do it without a route change.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';
import { app } from '@/api/localClient';
import { subscribeCanvasBus } from '@/lib/canvasBus';

export default function RecentsPicker({ currentCanvasId, onPick }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const load = async () => {
    try {
      const data = await app.entities.Canvas.list('-updated_date', 8);
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  };

  // Reload on open + subscribe to bus so we stay fresh as canvases get
  // renamed / pinned / created / deleted while the dropdown is open.
  useEffect(() => {
    if (!open) return;
    load();
    const unsub = subscribeCanvasBus(() => load());
    return unsub;
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Recent canvases"
        className="h-7 px-2 rounded flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[hsl(220,7%,45%)] hover:text-white transition-colors"
      >
        <Clock className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-[10000] w-72 rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,12%)] shadow-2xl p-1"
        >
          <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[hsl(220,7%,45%)]">
            Recent canvases
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[hsl(220,7%,50%)]">
              Nothing yet — start writing.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto spacerail-scroll py-1">
              {items.map((c) => {
                const isCurrent = c.id === currentCanvasId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { onPick?.(c.id); setOpen(false); }}
                      disabled={isCurrent}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-xs transition-colors ${
                        isCurrent
                          ? 'text-[hsl(220,7%,40%)] cursor-default'
                          : 'text-[hsl(220,7%,75%)] hover:bg-[hsl(var(--chalk-deep)/0.6)] hover:text-white'
                      }`}
                    >
                      <span className="text-sm leading-none shrink-0">{c.emoji || '📄'}</span>
                      <span className="truncate flex-1">{c.title || 'Untitled'}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[hsl(220,7%,40%)] shrink-0">
                          Open
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
