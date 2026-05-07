import { forwardRef } from 'react';
import { effectiveDimensions, resolvedMargins, inchToPx } from '@/lib/pageSetup';

// PageFrame — visual paper sheet, sized to the configured paper size + margins.
//
// v0.5.0: TiptapPagedEditor uses PageFrame for both vertical (visual
// pagination overlays) and side-to-side (each page is its own editor).
// The earlier LiveOverflowGuard "page full" chip is gone — side-to-side
// now has independent typeable pages with an Add Page button instead.
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

      {/* Content area — always passes children through as-is. v0.5.0
          dropped the LiveOverflowGuard "page full" chip because side-to-side
          now has independent typeable pages with an Add Page button. */}
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
          children
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

// v0.5.7 — Inverted corner-bracket guides at the margin intersections.
// Matches Word's print-layout cropmarks: the bracket sits AT the writable
// area corner with arms extending OUTWARD into the margin (not inward).
// Pre-v0.5.7 the arms pointed inward into the writable area, which Alaria
// flagged as the wrong direction in OTHER-SS-4.
function CornerBrackets({ padTop, padBottom, padLeft, padRight }) {
  const SIZE = 10;
  const COLOR = 'hsl(220, 8%, 60%)';
  const STROKE = 1;

  // Each corner: position the SIZE×SIZE bracket box so its writable-area
  // corner sits at the writable area's actual corner. Arms extend outward.
  // We use borderBottom + borderRight for TL (arms point up+left).
  // The rotations below produce: TL ⌟, TR ⌞, BL ⌝, BR ⌜ — Word style.
  const corners = [
    {
      // top-left: bracket corner is at (padLeft, padTop). Box extends up-left.
      pos: { top: padTop - SIZE, left: padLeft - SIZE },
      // borderBottom + borderRight → an L with corner at bottom-right of box
      // = bracket's elbow at (padLeft, padTop), arms going up + left into margin.
      borders: { borderBottom: `${STROKE}px solid ${COLOR}`, borderRight: `${STROKE}px solid ${COLOR}` },
    },
    {
      // top-right: bracket corner at (W-padRight, padTop), box extends up-right.
      pos: { top: padTop - SIZE, right: padRight - SIZE },
      borders: { borderBottom: `${STROKE}px solid ${COLOR}`, borderLeft: `${STROKE}px solid ${COLOR}` },
    },
    {
      // bot-left: bracket corner at (padLeft, H-padBottom), box extends down-left.
      pos: { bottom: padBottom - SIZE, left: padLeft - SIZE },
      borders: { borderTop: `${STROKE}px solid ${COLOR}`, borderRight: `${STROKE}px solid ${COLOR}` },
    },
    {
      // bot-right: bracket corner at (W-padRight, H-padBottom), box extends down-right.
      pos: { bottom: padBottom - SIZE, right: padRight - SIZE },
      borders: { borderTop: `${STROKE}px solid ${COLOR}`, borderLeft: `${STROKE}px solid ${COLOR}` },
    },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...c.pos,
            width: SIZE,
            height: SIZE,
            ...c.borders,
          }}
        />
      ))}
    </>
  );
}

export default PageFrame;
