import { forwardRef } from 'react';
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
  { setup, pageIndex = 0, live = false, children, number },
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

  return (
    <div
      ref={ref}
      data-page-frame
      data-page-index={pageIndex}
      className="page-frame relative shrink-0 mx-auto"
      style={{
        width: pageWidthPx,
        // Live page grows to fit content (phantom pages keep fixed height).
        minHeight: pageHeightPx,
        height: live ? 'auto' : pageHeightPx,
        background: 'hsl(0, 0%, 96%)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3)',
        borderRadius: 2,
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
      <div
        className="page-content"
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          minHeight: live ? pageHeightPx : '100%',
          height: live ? 'auto' : '100%',
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
