import { forwardRef, useEffect, useRef, useState } from 'react';
import { effectiveDimensions, resolvedMargins, inchToPx } from '@/lib/pageSetup';

// PageFrame — visual paper sheet, sized to the configured paper size + margins.
//
// In v0.4.38 only the FIRST page is "live" (hosts the actual Quill editor).
// Subsequent pages are phantom frames that show the layout but stay empty
// until v0.4.50 (Tiptap migration) gives us real content flow.
//
// Props:
//   setup       PageSetup
//   pageIndex   0-based page number (drives mirror margins)
//   live        if true, renders <children/> inside the content area; otherwise
//               renders a "Phantom" placeholder strip
//   children    typically the Quill editor for the live page
//   number      page number to display in the corner (1-based)

const PageFrame = forwardRef(function PageFrame(
  { setup, pageIndex = 0, live = false, children, number, fixedHeight = null },
  ref
) {
  const dims = effectiveDimensions(setup);
  const margins = resolvedMargins(setup, pageIndex);

  const pageWidthPx = inchToPx(dims.width);
  const pageHeightPx = inchToPx(dims.height);
  const padTop = inchToPx(margins.top);
  const padBottom = inchToPx(margins.bottom);
  const padLeft = inchToPx(margins.left);
  const padRight = inchToPx(margins.right);

  // When fixedHeight is provided (side-to-side mode), the page itself never
  // grows past one paper height — the editor inside scrolls instead.
  const heightStyle = fixedHeight != null
    ? { height: fixedHeight, minHeight: fixedHeight, maxHeight: fixedHeight }
    : { minHeight: pageHeightPx, height: live ? 'auto' : pageHeightPx };

  return (
    <div
      ref={ref}
      data-page-frame
      data-page-index={pageIndex}
      className="page-frame relative shrink-0 mx-auto"
      style={{
        width: pageWidthPx,
        ...heightStyle,
        background: 'hsl(0, 0%, 96%)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3)',
        borderRadius: 2,
        overflow: fixedHeight != null ? 'hidden' : 'visible',
      }}
    >
      {/* Margin guides — corner brackets, like Word's "Show Margins" */}
      <CornerBrackets padTop={padTop} padBottom={padBottom} padLeft={padLeft} padRight={padRight} />

      {/* Page number badge in the bottom corner */}
      {number != null && (
        <div
          className="absolute font-mono text-[9px] pointer-events-none select-none"
          style={{
            bottom: 6,
            // Recto pages put number on the right, verso on the left
            ...(setup.mirrorMargins && pageIndex % 2 === 1
              ? { left: 8 }
              : { right: 8 }),
            color: 'hsl(220, 8%, 55%)',
          }}
        >
          {number}
        </div>
      )}

      {/* Content area */}
      {/* v0.4.52 — in side-to-side mode (fixedHeight set) the live page now
          CLIPS instead of scrolling. Until the Tiptap migration in v0.5.0
          gives us real cross-page flow, this at least matches the "page
          shouldn't expand" expectation: text past the bottom margin is
          hidden behind a soft fade with a hint chip. */}
      <div
        className="page-content"
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          minHeight: fixedHeight != null ? '100%' : (live ? pageHeightPx : '100%'),
          height: fixedHeight != null ? '100%' : (live ? 'auto' : '100%'),
          overflow: fixedHeight != null && live ? 'hidden' : 'visible',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {live ? (
          fixedHeight != null ? (
            <LiveOverflowGuard padBottom={padBottom}>{children}</LiveOverflowGuard>
          ) : (
            children
          )
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: pageHeightPx - padTop - padBottom,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 22px, hsl(220, 10%, 88%) 22px, hsl(220, 10%, 88%) 23px)',
              opacity: 0.35,
              borderRadius: 1,
            }}
          />
        )}
      </div>
    </div>
  );
});

// LiveOverflowGuard — watches its single child for vertical overflow and
// shows a soft fade + "page full" chip when the editor's scrollHeight exceeds
// the page content area. This is a stopgap for side-to-side mode until real
// pagination ships with Tiptap.
function LiveOverflowGuard({ children, padBottom }) {
  const wrapRef = useRef(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    // The actual scrolling element inside Quill is .ql-editor.
    const findEditor = () => root.querySelector('.ql-editor');
    let editor = findEditor();
    let mounted = true;

    const measure = () => {
      if (!mounted) return;
      const e = editor || findEditor();
      if (!e) return;
      editor = e;
      const isOverflowing = e.scrollHeight - e.clientHeight > 2;
      setOverflow(isOverflowing);
    };

    const ro = new ResizeObserver(measure);
    const mo = new MutationObserver(measure);
    // Watch the wrapper for the editor mounting and for size changes inside.
    ro.observe(root);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    measure();

    return () => { mounted = false; ro.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <div ref={wrapRef} style={{ height: '100%', position: 'relative' }}>
      {children}
      {overflow && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: Math.max(48, padBottom),
              pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(245,245,245,0.9) 75%, hsl(0,0%,96%) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 6,
              transform: 'translateX(-50%)',
              padding: '2px 8px',
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
              color: 'hsl(220, 8%, 38%)',
              background: 'hsl(0, 0%, 92%)',
              border: '1px solid hsl(220, 8%, 78%)',
              borderRadius: 999,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
            title="Cross-page flow lands in v0.5.0 (Tiptap)"
          >
            page full · flow lands v0.5.0
          </div>
        </>
      )}
    </div>
  );
}

// Render four small corner-bracket guides at the margin intersections.
// Matches Word's faint corner marks in print layout.
function CornerBrackets({ padTop, padBottom, padLeft, padRight }) {
  const SIZE = 10;
  const COLOR = 'hsl(220, 8%, 60%)';
  const STROKE = 1;

  const corners = [
    { top: padTop - SIZE / 2, left: padLeft - SIZE / 2 },                 // top-left
    { top: padTop - SIZE / 2, right: padRight - SIZE / 2 },               // top-right
    { bottom: padBottom - SIZE / 2, left: padLeft - SIZE / 2 },           // bot-left
    { bottom: padBottom - SIZE / 2, right: padRight - SIZE / 2 },         // bot-right
  ];

  return (
    <>
      {corners.map((pos, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            width: SIZE,
            height: SIZE,
            borderTop: `${STROKE}px solid ${COLOR}`,
            borderLeft: `${STROKE}px solid ${COLOR}`,
            // Rotate to face inward depending on which corner this is
            transform:
              i === 1 ? 'rotate(90deg)' :
              i === 3 ? 'rotate(180deg)' :
              i === 2 ? 'rotate(-90deg)' : 'none',
          }}
        />
      ))}
    </>
  );
}

export default PageFrame;
