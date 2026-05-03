import { useEffect, useRef, useState } from 'react';

// CanvasRuler — Word-style ruler with three independent indent markers.
//
// Marker stack (matches Word 2024):
//   ▽  Top wedge       = First-line indent  (CSS text-indent on the block)
//   △  Middle wedge    = Hanging indent     (left-edge of lines 2+)
//   ▭  Bottom slab     = Left indent        (whole-paragraph left margin)
//
// Drag semantics (mirrors Word):
//   • Drag TOP      → updates text-indent only. Middle / bottom stay put.
//   • Drag MIDDLE   → updates Quill `indent` (which moves the left edge of
//                     lines 2+) AND adjusts text-indent inversely so the TOP
//                     wedge stays visually in the same absolute position.
//   • Drag BOTTOM   → updates Quill `indent`. Text-indent stays the same
//                     (relative to the new left edge), so the TOP wedge moves
//                     in lockstep with the bottom — i.e. the whole paragraph
//                     shifts left/right.
//
// The Tab key only updates Quill `indent`, so it slides middle+bottom but
// leaves top alone — fixing the v0.4.31 bug where the whole marker group
// drifted with every Tab.
//
// Tab stops: click empty bottom strip to drop, drag to move, right/double
// click to remove. Persisted per canvas in localStorage.

const PX_PER_INCH = 96;
const INDENT_STEP_INCHES = 0.5;
const FONT_SIZE_PX = 14;            // matches .ql-container font-size
const EM_PX = FONT_SIZE_PX;
const MARKER_HIT_RADIUS = 8;
const RULER_HEIGHT = 28;

// Convert Quill's `indent` level (0..8) → pixels off content-left edge.
const indentLevelToPx = (level) => level * INDENT_STEP_INCHES * PX_PER_INCH;
// Convert pixels → nearest Quill indent level.
const pxToIndentLevel = (px) =>
  Math.max(0, Math.min(8, Math.round(px / (INDENT_STEP_INCHES * PX_PER_INCH))));

// Parse a CSS text-indent value (e.g. "1.5em", "24px", "0", "") → em number.
const parseTextIndentEm = (val) => {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.endsWith('em')) return parseFloat(s) || 0;
  if (s.endsWith('px')) return (parseFloat(s) || 0) / EM_PX;
  return parseFloat(s) || 0;
};

// Parse a CSS padding-right value → px number.
const parsePaddingRightPx = (val) => {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.endsWith('px')) return parseFloat(s) || 0;
  if (s.endsWith('em')) return (parseFloat(s) || 0) * EM_PX;
  return parseFloat(s) || 0;
};

export default function CanvasRuler({ quillRef, canvasId }) {
  const trackRef = useRef(null);
  const [contentLeftPx, setContentLeftPx] = useState(24);
  const [contentWidthPx, setContentWidthPx] = useState(0);
  // Active paragraph state
  const [indentLevel, setIndentLevel] = useState(0);
  const [textIndentEm, setTextIndentEm] = useState(0);
  const [paddingRightPx, setPaddingRightPx] = useState(0);
  // Tab stops
  const [tabStops, setTabStops] = useState([]); // [{ id, leftPx }]
  const [drag, setDrag] = useState(null);
  // ^ { type: 'top' | 'middle' | 'bottom' | 'stop', id?, anchorTopPx? }

  // ── Sync marker positions with the active paragraph ─────────────────────
  useEffect(() => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const onSelection = () => {
      const fmt = q.getFormat?.() || {};
      setIndentLevel(parseInt(fmt.indent || 0, 10));
      setTextIndentEm(parseTextIndentEm(fmt['text-indent']));
      setPaddingRightPx(parsePaddingRightPx(fmt['padding-right']));
    };
    q.on('selection-change', onSelection);
    q.on('text-change', onSelection);
    onSelection();
    return () => {
      q.off('selection-change', onSelection);
      q.off('text-change', onSelection);
    };
  }, [quillRef]);

  // ── Measure editor geometry so ticks line up with text ─────────────────
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

  // ── Persist tab stops per canvas ────────────────────────────────────────
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

  // ── Marker absolute positions ────────────────────────────────────────────
  const leftIndentPx = indentLevelToPx(indentLevel);                    // middle + bottom
  const firstLineOffsetPx = textIndentEm * EM_PX;                       // top relative to middle
  const middleX = contentLeftPx + leftIndentPx;
  const bottomX = middleX;
  const topX = middleX + firstLineOffsetPx;
  const rightX = contentLeftPx + contentWidthPx - paddingRightPx;

  // ── Drag handlers ────────────────────────────────────────────────────────
  const beginDrag = (type, e, extra = {}) => {
    e.preventDefault();
    e.stopPropagation();
    const q = quillRef.current?.getEditor?.();
    if (q) q.focus();
    setDrag({ type, ...extra });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev) => {
      const track = trackRef.current;
      const q = quillRef.current?.getEditor?.();
      if (!track || !q) return;
      const rect = track.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const clampedX = Math.max(contentLeftPx, Math.min(contentLeftPx + contentWidthPx, x));

      if (drag.type === 'top') {
        // text-indent in em, relative to current left indent.
        const offsetPx = clampedX - (contentLeftPx + leftIndentPx);
        // Snap to nearest 0.25em for nicer UX.
        const em = Math.round((offsetPx / EM_PX) * 4) / 4;
        if (Math.abs(em - textIndentEm) > 0.01) {
          setTextIndentEm(em);
          q.format('text-indent', em ? `${em}em` : false, 'user');
        }
      } else if (drag.type === 'middle') {
        // New left indent level from cursor X. Then preserve TOP's absolute
        // position by adjusting text-indent inversely.
        const newLevel = pxToIndentLevel(clampedX - contentLeftPx);
        const newLeftIndentPx = indentLevelToPx(newLevel);
        // We want topX (the previous absolute first-line X) to stay constant.
        const desiredTopAbsPx = drag.anchorTopPx ?? topX;
        const newOffsetPx = desiredTopAbsPx - (contentLeftPx + newLeftIndentPx);
        const newEm = Math.round((newOffsetPx / EM_PX) * 4) / 4;
        if (newLevel !== indentLevel) {
          setIndentLevel(newLevel);
          q.format('indent', newLevel || false, 'user');
        }
        if (Math.abs(newEm - textIndentEm) > 0.01) {
          setTextIndentEm(newEm);
          q.format('text-indent', newEm ? `${newEm}em` : false, 'user');
        }
      } else if (drag.type === 'bottom') {
        // Moves left indent only — top travels with it (text-indent unchanged).
        const newLevel = pxToIndentLevel(clampedX - contentLeftPx);
        if (newLevel !== indentLevel) {
          setIndentLevel(newLevel);
          q.format('indent', newLevel || false, 'user');
        }
      } else if (drag.type === 'right') {
        // Right indent — driven by padding-right (px) on the active block.
        const newPaddingPx = Math.max(0, contentLeftPx + contentWidthPx - clampedX);
        // Snap to nearest 4px for nicer UX.
        const snapped = Math.round(newPaddingPx / 4) * 4;
        if (Math.abs(snapped - paddingRightPx) > 0.5) {
          setPaddingRightPx(snapped);
          q.format('padding-right', snapped ? `${snapped}px` : false, 'user');
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
  }, [drag, contentLeftPx, contentWidthPx, indentLevel, textIndentEm, paddingRightPx, leftIndentPx, topX, quillRef]);

  // ── Click empty ruler bottom-strip → add tab stop ───────────────────────
  const handleTrackClick = (e) => {
    if (drag) return;
    const track = trackRef.current;
    if (!track) return;
    const target = e.target;
    if (!(target === track || target?.dataset?.rulerEmpty === '1')) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y < RULER_HEIGHT * 0.4) return;
    if (x < contentLeftPx || x > contentLeftPx + contentWidthPx) return;
    // Skip if too close to any marker.
    const markerXs = [topX, middleX, bottomX, ...tabStops.map((s) => contentLeftPx + s.leftPx)];
    if (markerXs.some((mx) => Math.abs(mx - x) < MARKER_HIT_RADIUS)) return;
    const id = `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTabStops((prev) => [...prev, { id, leftPx: x - contentLeftPx }]);
  };

  const removeStop = (id) => setTabStops((prev) => prev.filter((s) => s.id !== id));

  // ── Ticks: every 1/8 inch, label every full inch ──────────────────────
  const inches = contentWidthPx > 0 ? Math.floor(contentWidthPx / PX_PER_INCH) : 0;
  const ticks = [];
  for (let i = 0; i <= inches * 8; i++) {
    const major = i % 8 === 0;
    const half = !major && i % 4 === 0;
    const quarter = !major && !half && i % 2 === 0;
    const xPx = contentLeftPx + (i / 8) * PX_PER_INCH;
    const label = major ? String(i / 8) : null;
    ticks.push({ xPx, major, half, quarter, label });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className="relative select-none cursor-default"
      style={{
        height: RULER_HEIGHT,
        background: 'hsl(220, 8%, 22%)',
        borderTop: '1px solid hsl(220, 8%, 14%)',
        borderBottom: '1px solid hsl(220, 8%, 14%)',
      }}
      data-ruler-empty="1"
      title="Drag the markers to set indents · click the bottom strip to drop a tab stop"
    >
      {/* Margin shading flanking the content area, like Word */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{ width: contentLeftPx, background: 'hsl(220, 8%, 16%)' }}
      />
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{ left: contentLeftPx + contentWidthPx, right: 0, background: 'hsl(220, 8%, 16%)' }}
      />

      {/* Inner inset strip */}
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

      {/* Ticks */}
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

      {/* Tab stops (draggable, right/double-click to remove) */}
      {tabStops.map((s) => {
        const left = contentLeftPx + s.leftPx;
        const isDragging = drag?.type === 'stop' && drag.id === s.id;
        return (
          <div
            key={s.id}
            onPointerDown={(e) => beginDrag('stop', e, { id: s.id })}
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
            {/* Word-style Left Tab ⌐ — vertical bar on left, foot extending right at bottom */}
            <svg viewBox="0 0 10 10" width="11" height="11" style={{ display: 'block' }}>
              <path d="M1 1 H2.5 V7.5 H9 V9 H1 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
            </svg>
          </div>
        );
      })}

      {/* TOP wedge: First-line indent ▽ — independent */}
      <div
        role="slider"
        aria-label="First-line indent"
        title={`First-line indent: ${textIndentEm.toFixed(2)}em`}
        onPointerDown={(e) => beginDrag('top', e)}
        className="absolute z-30"
        style={{
          left: topX,
          top: 1,
          transform: 'translateX(-50%)',
          width: 12,
          height: 7,
          cursor: drag?.type === 'top' ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 12 7" width="12" height="7" style={{ display: 'block' }}>
          <path d="M0 0 H12 L6 7 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* MIDDLE wedge: Hanging indent △ — adjusts left edge of lines 2+ while
          preserving the absolute X of the TOP wedge. */}
      <div
        role="slider"
        aria-label="Hanging indent"
        title={`Hanging indent: level ${indentLevel}`}
        onPointerDown={(e) => beginDrag('middle', e, { anchorTopPx: topX })}
        className="absolute z-30"
        style={{
          left: middleX,
          top: 9,
          transform: 'translateX(-50%)',
          width: 12,
          height: 7,
          cursor: drag?.type === 'middle' ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 12 7" width="12" height="7" style={{ display: 'block' }}>
          <path d="M6 0 L0 7 H12 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* RIGHT marker: Right indent ◁ — triangle pointing left, sits at right
          content edge. Driven by padding-right (px) block format. */}
      <div
        role="slider"
        aria-label="Right indent"
        title={`Right indent: ${paddingRightPx}px`}
        onPointerDown={(e) => beginDrag('right', e)}
        className="absolute z-30"
        style={{
          left: rightX,
          top: 9,
          transform: 'translateX(-50%)',
          width: 12,
          height: 7,
          cursor: drag?.type === 'right' ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 12 7" width="12" height="7" style={{ display: 'block' }}>
          <path d="M6 0 L0 7 H12 Z" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* BOTTOM slab: Left indent ▭ — moves the whole paragraph (top + middle
          travel together because text-indent stays constant). */}
      <div
        role="slider"
        aria-label="Left indent"
        title={`Left indent: level ${indentLevel}`}
        onPointerDown={(e) => beginDrag('bottom', e)}
        className="absolute z-30"
        style={{
          left: bottomX,
          bottom: 1,
          transform: 'translateX(-50%)',
          width: 12,
          height: 5,
          cursor: drag?.type === 'bottom' ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 12 5" width="12" height="5" style={{ display: 'block' }}>
          <rect x="0" y="0" width="12" height="5" rx="1" fill="hsl(220, 14%, 92%)" stroke="hsl(220, 8%, 14%)" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  );
}
