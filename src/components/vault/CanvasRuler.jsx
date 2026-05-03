import { useEffect, useRef, useState, useCallback } from 'react';

// CanvasRuler — Word-style ruler bar that sits above the editor.
//
// Visual language matches Word 2024:
//   • Monochrome (no pink/yellow accents). Light gray ticks, white digit
//     labels, dimmed margin shading.
//   • Hourglass left-indent marker (top wedge ▽ + bottom wedge △) — drag the
//     bottom wedge to set the active paragraph's left indent. Top wedge is
//     visual sibling (first-line indent placeholder; lands with Tiptap v0.5).
//   • L-shaped tab-stop glyphs in white. Click empty bottom-half of the ruler
//     to drop a stop; drag any existing stop to move it; right-click (or
//     drag-off) to remove.
//
// Implementation notes:
//   • Add-on-click is gated to the bottom 60% of the ruler height AND skips
//     if the click landed within 8px of an existing marker. This eliminates
//     the v0.4.30 "way too sensitive" problem where every accidental click
//     spawned a stop.
//   • Tab stops are persisted to localStorage per canvas id.
//   • Hooking Tab to actually JUMP to these stops requires a Parchment custom
//     blot; that lands in the v0.5 Tiptap migration. Today the ruler is the
//     visual layout metaphor + indent slider + stop manager.

const PX_PER_INCH = 96;
const INDENT_STEP_INCHES = 0.5;
const MARKER_HIT_RADIUS = 8; // px — clicks this close to an existing marker won't spawn a new stop
const RULER_HEIGHT = 28;

export default function CanvasRuler({ quillRef, canvasId }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [contentLeftPx, setContentLeftPx] = useState(24);
  const [contentWidthPx, setContentWidthPx] = useState(0);
  const [indentLevel, setIndentLevel] = useState(0);
  const [tabStops, setTabStops] = useState([]); // [{ id, leftPx }]
  const [drag, setDrag] = useState(null); // { type: 'indent' | 'stop', id?, startX, startLeft }

  // Track the active paragraph's indent so the marker reflects reality.
  useEffect(() => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const onSelection = () => {
      const fmt = q.getFormat?.() || {};
      setIndentLevel(parseInt(fmt.indent || 0, 10));
    };
    q.on('selection-change', onSelection);
    q.on('text-change', onSelection);
    onSelection();
    return () => {
      q.off('selection-change', onSelection);
      q.off('text-change', onSelection);
    };
  }, [quillRef]);

  // Measure the editor's actual content geometry so ticks line up with text.
  useEffect(() => {
    const measure = () => {
      const q = quillRef.current?.getEditor?.();
      const track = trackRef.current;
      if (!q || !track) return;
      const editor = q.root;
      const trackRect = track.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();
      const cs = window.getComputedStyle(editor);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      setTrackWidth(trackRect.width);
      setContentLeftPx(editorRect.left - trackRect.left + padL);
      setContentWidthPx(editorRect.width - padL - padR);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    const q = quillRef.current?.getEditor?.();
    if (q?.root) ro.observe(q.root);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [quillRef]);

  // Persist tab stops per canvas.
  useEffect(() => {
    if (!canvasId) return;
    try {
      const raw = localStorage.getItem(`quillosofi:tabstops:${canvasId}`);
      if (raw) setTabStops(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [canvasId]);
  useEffect(() => {
    if (!canvasId) return;
    try { localStorage.setItem(`quillosofi:tabstops:${canvasId}`, JSON.stringify(tabStops)); } catch { /* ignore */ }
  }, [tabStops, canvasId]);

  const indentMarkerLeftPx = contentLeftPx + indentLevel * INDENT_STEP_INCHES * PX_PER_INCH;

  // ── Drag logic, shared between indent marker and tab stops ─────────────────
  const beginDragIndent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const q = quillRef.current?.getEditor?.();
    if (q) q.focus();
    setDrag({ type: 'indent', startX: e.clientX, startLeft: indentMarkerLeftPx });
  };

  const beginDragStop = (e, stop) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ type: 'stop', id: stop.id, startX: e.clientX, startLeft: contentLeftPx + stop.leftPx });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const clampedX = Math.max(contentLeftPx, Math.min(contentLeftPx + contentWidthPx, x));
      if (drag.type === 'indent') {
        const q = quillRef.current?.getEditor?.();
        if (!q) return;
        const inches = (clampedX - contentLeftPx) / PX_PER_INCH;
        const level = Math.max(0, Math.min(8, Math.round(inches / INDENT_STEP_INCHES)));
        if (level !== indentLevel) {
          setIndentLevel(level);
          q.format('indent', level || false, 'user');
        }
      } else if (drag.type === 'stop') {
        setTabStops((prev) => prev.map((s) =>
          s.id === drag.id ? { ...s, leftPx: clampedX - contentLeftPx } : s
        ));
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, contentLeftPx, contentWidthPx, indentLevel, quillRef]);

  // ── Click-to-add tab stop, with sensitivity guards ────────────────────────
  const handleTrackClick = (e) => {
    if (drag) return;
    const track = trackRef.current;
    if (!track) return;
    // Only honor clicks that landed on the track itself (or its tick layer),
    // not on any marker buttons.
    const target = e.target;
    if (!(target === track || target?.dataset?.rulerEmpty === '1')) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Only the bottom 60% of the ruler is the "tab stop strip" — top portion
    // is reserved for the digit labels and feels mis-clicky to spawn stops in.
    if (y < RULER_HEIGHT * 0.4) return;
    // Inside the content area only.
    if (x < contentLeftPx || x > contentLeftPx + contentWidthPx) return;
    // Skip if the click is too close to the indent marker.
    if (Math.abs(x - indentMarkerLeftPx) < MARKER_HIT_RADIUS) return;
    // Skip if the click is too close to any existing stop.
    if (tabStops.some((s) => Math.abs((contentLeftPx + s.leftPx) - x) < MARKER_HIT_RADIUS)) return;
    const id = `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTabStops((prev) => [...prev, { id, leftPx: x - contentLeftPx }]);
  };

  const removeStop = (id) => setTabStops((prev) => prev.filter((s) => s.id !== id));

  // ── Ticks: every 1/8 inch, label every full inch ──────────────────────────
  const inches = contentWidthPx > 0 ? Math.floor(contentWidthPx / PX_PER_INCH) : 0;
  const ticks = [];
  for (let i = 0; i <= inches * 8; i++) {
    const major = i % 8 === 0;       // every 1.0 in
    const half = !major && i % 4 === 0; // every 0.5 in
    const quarter = !major && !half && i % 2 === 0; // every 0.25 in
    const xPx = contentLeftPx + (i / 8) * PX_PER_INCH;
    const label = major ? String(i / 8) : null;
    ticks.push({ xPx, major, half, quarter, label });
  }

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className="relative select-none cursor-default"
      style={{
        height: RULER_HEIGHT,
        background: 'hsl(220, 8%, 22%)',
        borderBottom: '1px solid hsl(220, 8%, 14%)',
        borderTop: '1px solid hsl(220, 8%, 14%)',
      }}
      data-ruler-empty="1"
      title="Click below the digits to drop a tab stop · drag the indent marker to adjust paragraph indent"
    >
      {/* Margin shading: dim the area outside the content width, like Word */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{ width: contentLeftPx, background: 'hsl(220, 8%, 16%)' }}
      />
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{ left: contentLeftPx + contentWidthPx, right: 0, background: 'hsl(220, 8%, 16%)' }}
      />

      {/* Inner content strip with subtle inset bevel like Word */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: contentLeftPx,
          width: contentWidthPx,
          top: 6,
          bottom: 6,
          background: 'hsl(220, 7%, 30%)',
          borderTop: '1px solid hsl(220, 7%, 38%)',
          borderBottom: '1px solid hsl(220, 7%, 18%)',
        }}
      />

      {/* Ticks (rendered above the inner strip) */}
      {ticks.map((t, i) => {
        const tickHeight = t.major ? 10 : t.half ? 6 : t.quarter ? 4 : 3;
        const tickColor = t.major ? 'hsl(220, 14%, 88%)' : 'hsl(220, 9%, 70%)';
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: t.xPx, top: '50%' }}
          >
            <div
              style={{
                position: 'absolute',
                top: -tickHeight / 2,
                left: 0,
                width: 1,
                height: tickHeight,
                background: tickColor,
              }}
            />
            {t.label !== null && (
              <span
                className="absolute font-mono leading-none"
                style={{
                  top: -RULER_HEIGHT / 2 + 4,
                  transform: 'translateX(-50%)',
                  fontSize: 9,
                  color: 'hsl(220, 14%, 92%)',
                }}
              >
                {t.label}
              </span>
            )}
          </div>
        );
      })}

      {/* Tab stops (draggable, right-click to remove) */}
      {tabStops.map((s) => {
        const left = contentLeftPx + s.leftPx;
        const isDragging = drag?.type === 'stop' && drag.id === s.id;
        return (
          <div
            key={s.id}
            onPointerDown={(e) => beginDragStop(e, s)}
            onContextMenu={(e) => { e.preventDefault(); removeStop(s.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); removeStop(s.id); }}
            title="Drag to move · right-click or double-click to remove"
            className="absolute z-10"
            style={{
              left,
              bottom: 2,
              transform: 'translateX(-50%)',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          >
            <svg viewBox="0 0 10 10" width="11" height="11" style={{ display: 'block' }}>
              {/* Word-style L-shaped left-tab glyph */}
              <path d="M1 1 H8 V2.5 H2.5 V9 H1 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
            </svg>
          </div>
        );
      })}

      {/* Hourglass left-indent marker: top wedge (first-line) + bottom wedge (left margin) */}
      <div
        className="absolute z-20"
        style={{
          left: indentMarkerLeftPx,
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Top wedge — placeholder for first-line indent (drag handler comes with v0.5) */}
        <svg
          viewBox="0 0 12 7"
          width="12"
          height="7"
          style={{ position: 'absolute', top: 1, left: 0, display: 'block' }}
        >
          <path d="M0 0 H12 L6 7 Z" fill="hsl(220, 14%, 88%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
        </svg>
        {/* Bottom wedge — interactive (drives the actual indent) */}
        <div
          role="slider"
          aria-label="Left indent"
          aria-valuenow={indentLevel}
          aria-valuemin={0}
          aria-valuemax={8}
          onPointerDown={beginDragIndent}
          title={`Left indent: level ${indentLevel} · drag to adjust`}
          style={{
            position: 'absolute',
            bottom: 1,
            left: 0,
            width: 12,
            height: 7,
            cursor: drag?.type === 'indent' ? 'grabbing' : 'grab',
            touchAction: 'none',
            pointerEvents: 'auto',
          }}
        >
          <svg viewBox="0 0 12 7" width="12" height="7" style={{ display: 'block' }}>
            <path d="M6 0 L0 7 H12 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
