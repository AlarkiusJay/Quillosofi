/*
 * Wrapper for a single widget on the Quillounge home page.
 * Handles drag/resize handles, the per-widget settings popover (opacity +
 * theme), and shells the widget content.
 */

import { useState, useRef, useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import { WIDGET_THEMES } from './widgets';

export default function QuilloungeWidget({ id, title, settings, onSettingsChange, children, editing }) {
  const [openSettings, setOpenSettings] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!openSettings) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenSettings(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openSettings]);

  const theme = WIDGET_THEMES[settings.theme] || WIDGET_THEMES.glass;

  return (
    <div
      className="h-full w-full rounded-2xl border border-[hsl(225,9%,22%)] flex flex-col overflow-hidden shadow-sm relative"
      style={{
        background: theme.bg,
        opacity: settings.opacity ?? 1,
      }}
    >
      <div className="widget-header flex items-center justify-between px-4 py-2 border-b border-black/30 shrink-0 select-none cursor-move" data-widget-handle>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.accent }} />
          <h3 className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: theme.accent }}>{title}</h3>
        </div>
        <div className="relative flex items-center gap-1">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setOpenSettings(v => !v); }}
            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,50%)] hover:text-white hover:bg-[hsl(228,7%,25%)] transition-colors"
            title="Widget settings"
          >
            <Sliders className="h-3 w-3" />
          </button>
          {openSettings && (
            <div
              ref={ref}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-50 w-56 rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,12%)] shadow-2xl p-3 space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,50%)] font-semibold">Opacity</span>
                  <span className="text-[10px] text-white tabular-nums">{Math.round((settings.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range" min="0.3" max="1" step="0.02"
                  value={settings.opacity ?? 1}
                  onChange={(e) => onSettingsChange({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,50%)] font-semibold mb-1.5">Theme</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(WIDGET_THEMES).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => onSettingsChange({ theme: k })}
                      className={`h-8 rounded-lg border text-[10px] font-medium transition-all ${settings.theme === k ? 'ring-2 ring-primary border-primary/50' : 'border-[hsl(225,9%,22%)] hover:border-primary/40'}`}
                      style={{ background: v.bg, color: v.accent }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {editing && (
                <p className="text-[10px] text-[hsl(220,7%,55%)] leading-snug border-t border-[hsl(225,9%,18%)] pt-2">
                  Drag the header to move · drag the corner to resize
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {children}
      </div>
    </div>
  );
}
