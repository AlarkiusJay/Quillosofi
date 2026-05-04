import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageFrame from './PageFrame';
import { effectiveDimensions, inchToPx } from '@/lib/pageSetup';
import { cn } from '@/lib/utils';

// PageView — outer scrollable container that lays out PageFrame(s) according
// to the current view mode, and hosts the live Quill editor on page 1.
//
// Modes:
//   • vertical + one        → single column, just page 1 (live)
//   • vertical + multiple   → page 1 (live) + N phantom pages stacked below
//   • side-to-side          → horizontal book spread; arrows page through
//                             pairs. Page 1 is always shown live in spread 0.
//
// In v0.4.38 phantom pages are visual-only; v0.4.50 (Tiptap) flows real
// content into them.
//
// Props:
//   setup          PageSetup
//   children       the live editor element (rendered inside page 1)

const PHANTOM_COUNT = 3; // how many phantom pages to show in 'multiple' view

export default function PageView({ setup, children }) {
  const containerRef = useRef(null);
  const [spreadIndex, setSpreadIndex] = useState(0);

  // When swapping into side-to-side, snap to spread 0 (live page).
  useEffect(() => {
    if (setup.pageMovement === 'side-to-side') setSpreadIndex(0);
  }, [setup.pageMovement]);

  const { width: pw } = effectiveDimensions(setup);
  const pageWidthPx = inchToPx(pw);
  const zoomedWidth = Math.round(pageWidthPx * setup.zoom);

  // ── Vertical mode ────────────────────────────────────────────────────────
  if (setup.pageMovement === 'vertical') {
    const showMultiple = setup.pageLayout === 'multiple';

    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ background: 'hsl(220, 12%, 9%)' }}
      >
        <div
          className="flex flex-col items-center gap-6 py-8 px-4"
          style={{
            transform: `scale(${setup.zoom})`,
            transformOrigin: 'top center',
            // Compensate the container width so scrollbar tracks scaled content
            width: setup.zoom !== 1 ? `${100 / setup.zoom}%` : '100%',
          }}
        >
          {/* Live page (always page 1) */}
          <PageFrame setup={setup} pageIndex={0} live number={1}>
            {children}
          </PageFrame>

          {/* Phantom pages — only in 'multiple' layout */}
          {showMultiple && Array.from({ length: PHANTOM_COUNT }).map((_, i) => (
            <PageFrame
              key={`phantom-${i}`}
              setup={setup}
              pageIndex={i + 1}
              live={false}
              number={i + 2}
            />
          ))}

          {showMultiple && (
            <div className="text-[10px] text-[hsl(220,7%,40%)] italic font-mono pb-4">
              phantom pages — real flow lands in v0.4.50 (Tiptap)
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Side-to-Side (book spread) mode ─────────────────────────────────────
  // Spread 0 = [verso (blank/phantom), recto (live page 1)]   ← like a book cover
  // Spread N = [verso phantom 2N, recto phantom 2N+1]
  //
  // We treat the live page as the right (recto) page of spread 0 so the
  // book opens to "page 1 on the right" like a printed book. If the user
  // wants the live page on the left, they can flip with the arrow keys.

  const renderSpread = (idx) => {
    if (idx === 0) {
      // Verso phantom (or empty), recto live
      return (
        <>
          <PageFrame setup={setup} pageIndex={1} live={false} number={null} />
          <PageFrame setup={setup} pageIndex={0} live number={1}>
            {children}
          </PageFrame>
        </>
      );
    }
    return (
      <>
        <PageFrame setup={setup} pageIndex={(idx * 2) - 1} live={false} number={idx * 2} />
        <PageFrame setup={setup} pageIndex={(idx * 2)}     live={false} number={idx * 2 + 1} />
      </>
    );
  };

  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < PHANTOM_COUNT;

  return (
    <div
      className="flex-1 overflow-auto relative"
      style={{ background: 'hsl(220, 12%, 9%)' }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' && canPrev) setSpreadIndex(spreadIndex - 1);
        if (e.key === 'ArrowRight' && canNext) setSpreadIndex(spreadIndex + 1);
      }}
      tabIndex={0}
    >
      {/* Spine seam — subtle gradient down the middle */}
      <div
        className="absolute inset-y-0 left-1/2 pointer-events-none"
        style={{
          width: 24,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4), transparent 70%)',
          zIndex: 1,
        }}
      />

      <div
        className="flex items-start justify-center gap-1 py-8 px-4 relative"
        style={{
          transform: `scale(${setup.zoom})`,
          transformOrigin: 'top center',
          width: setup.zoom !== 1 ? `${100 / setup.zoom}%` : '100%',
          zIndex: 2,
        }}
      >
        {renderSpread(spreadIndex)}
      </div>

      {/* Page nav arrows */}
      <button
        onClick={() => canPrev && setSpreadIndex(spreadIndex - 1)}
        disabled={!canPrev}
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all z-10',
          'bg-[hsl(var(--chalk-deep)/0.85)] border border-[hsl(var(--chalk-white-faint)/0.25)] backdrop-blur-sm',
          canPrev
            ? 'text-white hover:bg-[hsl(var(--chalk-deep))] cursor-pointer'
            : 'text-[hsl(220,7%,30%)] cursor-not-allowed opacity-40'
        )}
        title="Previous spread (←)"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => canNext && setSpreadIndex(spreadIndex + 1)}
        disabled={!canNext}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all z-10',
          'bg-[hsl(var(--chalk-deep)/0.85)] border border-[hsl(var(--chalk-white-faint)/0.25)] backdrop-blur-sm',
          canNext
            ? 'text-white hover:bg-[hsl(var(--chalk-deep))] cursor-pointer'
            : 'text-[hsl(220,7%,30%)] cursor-not-allowed opacity-40'
        )}
        title="Next spread (→)"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Spread indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-mono rounded-full bg-[hsl(var(--chalk-deep)/0.85)] border border-[hsl(var(--chalk-white-faint)/0.2)] text-[hsl(220,7%,65%)] z-10">
        Spread {spreadIndex + 1} / {PHANTOM_COUNT + 1} · phantom flow lands in v0.4.50
      </div>
    </div>
  );
}
