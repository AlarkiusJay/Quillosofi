/*
 * Wrapper for a single widget on the Quillounge home page.
 *
 * v0.4.20 redesign:
 *   - Each widget is now a sticky note pinned to the chalkboard.
 *   - The sticky note look (paper color, thumbtack, slight rotation, paper
 *     shadow) lives in index.css under `.sticky-note` + `.sticky-tack`.
 *   - This component just wires settings (color/opacity) into CSS custom
 *     properties on the wrapper, and keeps the existing drag/resize/edit-
 *     mode handles intact so react-grid-layout still works.
 *   - The per-widget rotation is hashed from the widget id so it's stable
 *     across reloads (widget A always tilts the same way) without storing
 *     extra state. Range is intentionally subtle: ±1.2°.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Sliders } from 'lucide-react';
import { WIDGET_THEMES, STICKY_SWATCHES } from './widgets';

// Deterministic small rotation per widget id. Same id => same rotation
// every render. djb2-ish hash, mapped to ±1.2°.
function rotationForId(id) {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i);
  // Map to [-1.2, 1.2] degrees, in 0.1° steps for a slight handmade feel.
  const buckets = 25; // -12..12 -> 25 values
  const idx = ((h % buckets) + buckets) % buckets;
  return ((idx - 12) / 10).toFixed(1);
}

export default function QuilloungeWidget({ id, title, settings, onSettingsChange, children, editing }) {
  const [openSettings, setOpenSettings] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!openSettings) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenSettings(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openSettings]);

  // Resolve theme — fall back to manila if a stale theme key is in storage.
  const theme = WIDGET_THEMES[settings.theme] || WIDGET_THEMES.manila;
  const rot = useMemo(() => rotationForId(id), [id]);

  return (
    <div
      className="sticky-note h-full w-full flex flex-col overflow-hidden relative"
      style={{
        // theme.paper / theme.tack are "var(--name)" strings; the .sticky-note
        // CSS reads --paper / --tack via hsl(var(--paper)) so we just plug them
        // straight in. The CSS custom property chain handles the rest.
        '--paper': theme.paper,
        '--rot': `${rot}deg`,
        opacity: settings.opacity ?? 1,
      }}
    >
      {/* Thumbtack — sits at the top center of the sticky. Pure CSS, no asset. */}
      <span
        className="sticky-tack"
        style={{ '--tack': theme.tack }}
        aria-hidden="true"
      />

      <div
        className="widget-header flex items-center justify-between px-4 pt-3 pb-2 shrink-0 select-none cursor-move"
        data-widget-handle
        style={{ color: 'hsl(var(--sticky-ink))' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-instrument text-[12px] uppercase tracking-[0.18em] font-semibold opacity-80">
            {title}
          </h3>
        </div>
        <div className="relative flex items-center gap-1">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setOpenSettings(v => !v); }}
            className="h-6 w-6 rounded flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-black/10 transition-all"
            title="Sticky settings"
            style={{ color: 'hsl(var(--sticky-ink))' }}
          >
            <Sliders className="h-3 w-3" />
          </button>
          {openSettings && (
            <div
              ref={ref}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-50 w-60 rounded-xl border shadow-2xl p-3 space-y-3"
              style={{
                background: 'hsl(var(--chalk-deep))',
                borderColor: 'hsl(var(--chalk-white-faint))',
                color: 'hsl(var(--chalk-white))',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider chalk-muted font-semibold">Opacity</span>
                  <span className="text-[10px] chalk-text tabular-nums">{Math.round((settings.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range" min="0.4" max="1" step="0.02"
                  value={settings.opacity ?? 1}
                  onChange={(e) => onSettingsChange({ opacity: parseFloat(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: 'hsl(var(--chalk-yellow))' }}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider chalk-muted font-semibold mb-1.5">Paper color</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {STICKY_SWATCHES.map((k) => {
                    const v = WIDGET_THEMES[k];
                    const isActive = settings.theme === k;
                    return (
                      <button
                        key={k}
                        onClick={() => onSettingsChange({ theme: k })}
                        className="h-8 rounded-md border text-[10px] font-medium transition-all"
                        style={{
                          background: `hsl(${v.paper})`,
                          color: 'hsl(var(--sticky-ink))',
                          borderColor: isActive ? 'hsl(var(--chalk-yellow))' : 'hsl(var(--chalk-white-faint) / 0.4)',
                          boxShadow: isActive ? '0 0 0 2px hsl(var(--chalk-yellow) / 0.4)' : 'none',
                        }}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {editing && (
                <p
                  className="text-[10px] leading-snug pt-2 chalk-muted"
                  style={{ borderTop: '1px solid hsl(var(--chalk-white-faint) / 0.4)' }}
                >
                  Drag the header to move · drag the corner to resize
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto px-4 pb-4 min-h-0"
        style={{ color: 'hsl(var(--sticky-ink))' }}
      >
        {children}
      </div>
    </div>
  );
}
