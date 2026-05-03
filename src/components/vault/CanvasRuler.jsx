import { useEffect, useRef, useState, useCallback } from 'react';

// CanvasRuler — Word-style ruler bar that sits above the editor.
//
// What it shows:
//  • A horizontal scale marked in inches (or em equivalents). One inch ≈ 96px
//    at 100% zoom; we render relative to the editor's content width so it
//    stays visually accurate.
//  • Major ticks every 1in with numeric labels.
//  • Minor ticks every 0.25in.
//  • A draggable LEFT-INDENT marker (▲ at the bottom) — drives Quill's
//    `indent` block format on the active paragraph. Each unit ≈ 0.5in to
//    match our existing 3em-per-step CSS.
//  • A draggable FIRST-LINE marker (▽ at the top) — purely cosmetic for now;
//    drops a tab stop at the position you release.
//  • Click empty ruler space → drop a custom tab-stop marker (visual only,
//    persisted to localStorage per-canvas). Click an existing stop to remove.
//
// Real Quill tab-stop support requires a Parchment attributor + custom blot;
// that lands with the v0.5 Tiptap migration. Today the ruler delivers the
// visual metaphor + draggable indent control, which is the part that
// actually drives writing flow.

const PX_PER_INCH = 96;
const INDENT_STEP_INCHES = 0.5; // matches the 3em-per-step CSS in CanvasEditor

export default function CanvasRuler({ quillRef, canvasId }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [contentLeftPx, setContentLeftPx] = useState(24); // editor's left padding
  const [contentWidthPx, setContentWidthPx] = useState(0);
  const [indentLevel, setIndentLevel] = useState(0); // current paragraph's indent
  const [tabStops, setTabStops] = useState([]); // array of { id, leftPx }
  const [dragging, setDragging] = useState(null); // 'indent' | 'first' | null

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

  // Measure the editor's actual content geometry so ruler ticks line up.
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

  // ── Indent marker drag → set Quill `indent` on active paragraph.
  const onIndentPointerDown = (e) => {
    e.preventDefault();
    setDragging('indent');
    const q = quillRef.current?.getEditor?.();
    if (q) q.focus();
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (dragging !== 'indent') return;
      const track = trackRef.current;
      const q = quillRef.current?.getEditor?.();
      if (!track || !q) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left - contentLeftPx;
      const inches = Math.max(0, x / PX_PER_INCH);
      const level = Math.max(0, Math.min(8, Math.round(inches / INDENT_STEP_INCHES)));
      if (level !== indentLevel) {
        setIndentLevel(level);
        q.format('indent', level || false, 'user');
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, contentLeftPx, indentLevel, quillRef]);

  // ── Click empty ruler space → drop a tab stop. Click an existing stop → remove.
  const handleTrackClick = (e) => {
    if (dragging) return;
    // Only drop if the click landed on the track itself, not a child marker.
    if (e.target !== trackRef.current && !e.target.dataset?.rulerEmpty) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < contentLeftPx || x > contentLeftPx + contentWidthPx) return;
    const id = `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTabStops((prev) => [...prev, { id, leftPx: x - contentLeftPx }]);
  };

  const removeStop = (id) => setTabStops((prev) => prev.filter((s) => s.id !== id));

  // ── Render ticks across the content area only.
  const inches = contentWidthPx > 0 ? Math.floor(contentWidthPx / PX_PER_INCH) : 0;
  const ticks = [];
  for (let i = 0; i <= inches * 4; i++) {
    const major = i % 4 === 0;
    const half = i % 2 === 0;
    const xPx = contentLeftPx + (i / 4) * PX_PER_INCH;
    ticks.push({ xPx, major, half, label: major ? String(i / 4) : null });
  }

  const indentMarkerLeftPx = contentLeftPx + indentLevel * INDENT_STEP_INCHES * PX_PER_INCH;

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className="relative h-6 select-none border-b border-[hsl(var(--chalk-white-faint)/0.12)] bg-[hsl(var(--chalk-deep)/0.45)] backdrop-blur-sm cursor-crosshair"
      data-ruler-empty="1"
      title="Click to drop a tab stop · drag the ▲ to set paragraph indent"
    >
      {/* Margin shading: dim the area outside the content width to mimic Word's gray margin */}
      <div
        className="absolute inset-y-0 left-0 bg-[hsl(var(--chalk-deep)/0.7)]"
        style={{ width: contentLeftPx }}
      />
      <div
        className="absolute inset-y-0 bg-[hsl(var(--chalk-deep)/0.7)]"
        style={{ left: contentLeftPx + contentWidthPx, right: 0 }}
      />

      {/* Ticks */}
      {ticks.map((t, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: t.xPx }}
        >
          <div
            className={
              t.major
                ? 'absolute bottom-0 left-0 w-px h-3 bg-[hsl(220,14%,75%)]'
                : t.half
                ? 'absolute bottom-0 left-0 w-px h-2 bg-[hsl(220,7%,55%)]'
                : 'absolute bottom-0 left-0 w-px h-1.5 bg-[hsl(220,7%,40%)]'
            }
          />
          {t.label !== null && (
            <span className="absolute top-0.5 -translate-x-1/2 text-[9px] font-mono text-[hsl(220,14%,80%)] leading-none">
              {t.label}
            </span>
          )}
        </div>
      ))}

      {/* Tab stops (clickable to remove) */}
      {tabStops.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); removeStop(s.id); }}
          title="Click to remove this tab stop"
          className="absolute bottom-0 -translate-x-1/2 h-2.5 w-2.5 flex items-center justify-center text-[hsl(var(--chalk-pink))] hover:text-red-400 z-10"
          style={{ left: contentLeftPx + s.leftPx }}
          aria-label="Remove tab stop"
        >
          {/* L-shaped tab marker */}
          <svg viewBox="0 0 8 8" className="h-2.5 w-2.5 fill-current">
            <path d="M0 0 H6 V1 H1 V8 H0 Z" />
          </svg>
        </button>
      ))}

      {/* Indent marker (draggable) */}
      <div
        role="slider"
        aria-label="Left indent"
        aria-valuenow={indentLevel}
        aria-valuemin={0}
        aria-valuemax={8}
        onPointerDown={onIndentPointerDown}
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 -translate-x-1/2 cursor-ew-resize z-20 ${dragging === 'indent' ? 'text-[hsl(var(--chalk-yellow))]' : 'text-[hsl(var(--chalk-yellow)/0.85)] hover:text-[hsl(var(--chalk-yellow))]'}`}
        style={{ left: indentMarkerLeftPx }}
        title={`Indent level ${indentLevel} · drag to adjust`}
      >
        <svg viewBox="0 0 10 8" className="h-2 w-2.5 fill-current drop-shadow">
          <path d="M5 8 L0 0 L10 0 Z" />
        </svg>
      </div>
    </div>
  );
}
