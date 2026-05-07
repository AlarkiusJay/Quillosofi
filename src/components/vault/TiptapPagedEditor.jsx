// TiptapPagedEditor — v0.5.7 (Path B: overflow-driven pagination)
//
// Replaces the v0.4.x ReactQuill instance. Owns one Tiptap editor per page
// in any paginated mode. Pagination happens via an overflow controller:
//
//   • Each page editor reports its scrollHeight.
//   • If a page overflows its page-content height, the controller migrates
//     the last top-level block to the next page (creating the next page if
//     needed).
//   • If a page underflows AND the next page has blocks, the controller
//     pulls blocks back to fill (Word-style reflow).
//
// Architecture per mode:
//
//   • Vertical + Single (legacy): one big editor in a continuous scroll
//                column. v0.4.x behaviour preserved.
//
//   • Vertical + Multiple (NEW v0.5.7): N stacked page editors with
//                overflow rebalancing. Vertical scroll between pages.
//
//   • Side-to-Side: pairs of page editors per spread, fit-to-viewport,
//                horizontal scroll between spreads. Overflow rebalancing.
//                No more +Add page tile — pages spawn automatically.
//
// Storage model is unchanged from v0.5.0: `content` for vertical-single,
// `pages[]` array for paginated modes (vertical+multiple and side-to-side).

import { useEffect, useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { buildExtensions, TIPTAP_BASE_CSS } from '@/lib/tiptap/editorConfig';
import { migrateLegacyContent } from '@/lib/tiptap/migrateContent';
import { effectiveDimensions, inchToPx, resolvedMargins } from '@/lib/pageSetup';
import PageFrame from './PageFrame';

// ── Page editor — a single Tiptap instance for one paginated page ─────────
// Reports its scrollHeight back to the controller so overflow can be
// detected. A `seedHtml` prop sets the initial content; subsequent updates
// to `seedHtml` (e.g. from migration) are pushed in via setContent without
// remounting the editor (preserves focus state where possible).
function PageEditor({
  seedHtml,
  placeholder,
  ariaLabel,
  onUpdate,
  onFocus,
  onReady,
  onMeasure,
  pageIndex,
}) {
  const editor = useEditor({
    extensions: buildExtensions({ placeholder }),
    content: seedHtml || '',
    onUpdate({ editor }) {
      onUpdate?.(editor.getHTML(), editor);
      // Overflow controller will measure on next rAF.
    },
    onFocus({ editor }) { onFocus?.(editor); },
    editorProps: {
      attributes: {
        'aria-label': ariaLabel || `Canvas page ${pageIndex + 1}`,
        spellcheck: 'true',
      },
      // v0.5.7 — Paste behavior fix.
      // Default Tiptap pastes any HTML containing a block-level element
      // (<p>, <div>, etc.) as a NEW block, splitting the current paragraph.
      // Most external sources (browsers, docs, emails) wrap even single-line
      // copies in <p>...</p>, so a paste in the middle of a sentence ends up
      // on a new line instead of inline. We unwrap single-block HTML so it
      // inserts inline at the cursor; multi-block HTML still inserts as
      // proper paragraphs.
      transformPastedHTML(html) {
        try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const body = doc.body;
          if (!body) return html;
          // Strip stray wrapping <html><head><meta> stuff Word/Office injects.
          // We only care about the body's direct block children.
          const blocks = Array.from(body.children).filter(
            (n) => n.nodeType === 1
          );
          if (blocks.length === 1) {
            const only = blocks[0];
            // Single block-level wrapper around inline content — unwrap.
            const isUnwrapTarget = /^(P|DIV|SPAN|H[1-6])$/.test(only.tagName);
            if (isUnwrapTarget) {
              // Return just the inline children. Use innerHTML so formatting
              // (bold, italic, links) is preserved as inline marks.
              return only.innerHTML;
            }
          }
          return html;
        } catch {
          return html;
        }
      },
    },
  });

  // Push external content changes (from migration) into the editor without
  // recreating it. Compare HTML to avoid extra setContent on no-op updates.
  const lastSeedRef = useRef(seedHtml);
  useEffect(() => {
    if (!editor) return;
    if (seedHtml === lastSeedRef.current) return;
    const cur = editor.getHTML();
    if (cur === seedHtml) {
      lastSeedRef.current = seedHtml;
      return;
    }
    // Migration update — replace content. Do NOT focus (caller decides).
    editor.commands.setContent(seedHtml || '', false, { preserveWhitespace: 'full' });
    lastSeedRef.current = seedHtml;
  }, [seedHtml, editor]);

  useEffect(() => {
    if (editor) onReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Continuously measure scrollHeight and feed the controller.
  const measureRef = useRef(null);
  const setMeasureNode = useCallback((node) => {
    measureRef.current = node;
  }, []);

  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    let lastReported = -1;
    const tick = () => {
      const dom = editor.view?.dom;
      if (dom) {
        const h = dom.scrollHeight;
        if (h !== lastReported) {
          lastReported = h;
          onMeasure?.(pageIndex, h);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [editor, pageIndex, onMeasure]);

  return (
    <div ref={setMeasureNode} className="h-full overflow-hidden">
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}

// ── Overflow controller — rebalances pages[] based on per-page heights ────
// Convergence:
//  - Runs once per measurement tick (debounced 80ms after the latest
//    measurement signal)
//  - Performs at most ONE migration per tick (move 1 block down, OR pull 1
//    block up). The next measurement triggers the next migration if needed.
//  - Threshold: a page overflows when scrollHeight > contentHeightPx + 4
//    (4px slack for sub-pixel rounding). A page underflows when there's
//    enough room (scrollHeight + nextFirstBlockHeight estimate < contentHeightPx).
//
// HTML splicing operates on top-level child nodes of the editor body. We
// use a DOMParser to split blocks reliably.
function splitTopLevelBlocks(html) {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;
  if (!root) return [];
  return Array.from(root.children).map(el => el.outerHTML);
}

function joinTopLevelBlocks(blocks) {
  return blocks.join('');
}

function isPageEffectivelyEmpty(html) {
  if (!html) return true;
  // A single empty paragraph is "empty" for migration purposes.
  const blocks = splitTopLevelBlocks(html);
  if (blocks.length === 0) return true;
  if (blocks.length === 1) {
    const text = blocks[0].replace(/<[^>]+>/g, '').trim();
    return text === '';
  }
  return false;
}

function usePaginationController({
  pages,
  setPages,
  contentHeightPx,
  isPaginated,
}) {
  // Map of pageIndex → last reported scrollHeight.
  const heightsRef = useRef(new Map());
  const debounceRef = useRef(null);

  const onMeasure = useCallback((idx, h) => {
    heightsRef.current.set(idx, h);
    if (!isPaginated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runRebalance();
    }, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaginated, contentHeightPx]);

  // Stable ref to the latest `pages` so the rebalance can read current state.
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  function runRebalance() {
    const current = pagesRef.current;
    if (!Array.isArray(current) || current.length === 0) return;
    const heights = heightsRef.current;
    const SLACK = 4;

    // 1) OVERFLOW pass — first overflowing page wins.
    for (let i = 0; i < current.length; i++) {
      const h = heights.get(i);
      if (typeof h !== 'number') continue;
      if (h > contentHeightPx + SLACK) {
        // Migrate last block from page i to start of page i+1.
        const blocks = splitTopLevelBlocks(current[i]);
        if (blocks.length <= 1) {
          // Can't migrate without leaving page empty. Skip; honest visible
          // overflow until the user types more (a single huge block can't
          // be split safely without losing structure).
          continue;
        }
        const lastBlock = blocks.pop();
        const newPageI = joinTopLevelBlocks(blocks);
        const next = current.slice();
        next[i] = newPageI;
        if (i + 1 < next.length) {
          const nextBlocks = splitTopLevelBlocks(next[i + 1]);
          // Drop a trailing empty paragraph on next page if present, since
          // the migrated block fills its head.
          if (isPageEffectivelyEmpty(next[i + 1])) {
            next[i + 1] = lastBlock;
          } else {
            next[i + 1] = lastBlock + joinTopLevelBlocks(nextBlocks);
          }
        } else {
          // Spawn a new page.
          next.push(lastBlock);
        }
        setPages(next);
        return;
      }
    }

    // 2) UNDERFLOW pass — pull from next page if there's room.
    for (let i = 0; i < current.length - 1; i++) {
      const h = heights.get(i);
      if (typeof h !== 'number') continue;
      // Only pull if there's substantial empty space (>20% of page height).
      const room = contentHeightPx - h;
      if (room < contentHeightPx * 0.2) continue;

      const nextBlocks = splitTopLevelBlocks(current[i + 1]);
      if (nextBlocks.length === 0) continue;
      // Don't pull if the next page only has one empty paragraph.
      if (isPageEffectivelyEmpty(current[i + 1])) continue;

      const firstNextBlock = nextBlocks.shift();
      const next = current.slice();
      const myBlocks = splitTopLevelBlocks(current[i]);
      // If my page is one empty paragraph, replace it; otherwise append.
      if (isPageEffectivelyEmpty(current[i])) {
        next[i] = firstNextBlock;
      } else {
        next[i] = joinTopLevelBlocks(myBlocks) + firstNextBlock;
      }
      next[i + 1] = joinTopLevelBlocks(nextBlocks);
      // If the now-empty trailing page is the last and is empty, drop it.
      if (i + 1 === next.length - 1 && next[i + 1] === '') {
        next.pop();
      }
      setPages(next);
      return;
    }
  }

  // Cleanup on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { onMeasure };
}

// ── Top-level component ──────────────────────────────────────────────────
const TiptapPagedEditor = forwardRef(function TiptapPagedEditor(
  {
    setup,
    canvas,
    initialContent,
    initialPages,
    onContentChange,
    onPagesChange,
    onActiveEditorChange,
  },
  ref
) {
  const isSideToSide = setup.pageMovement === 'side-to-side';
  const isPaginatedSingle = setup.pageMovement === 'vertical' && setup.pageLayout === 'multiple';
  const isContinuousSingle = setup.pageMovement === 'vertical' && setup.pageLayout === 'one';

  const dims = effectiveDimensions(setup);
  const pageWidthPx = inchToPx(dims.width);
  const pageHeightPx = inchToPx(dims.height);
  const margins = resolvedMargins(setup, 0);
  const padTop = inchToPx(margins.top);
  const padBottom = inchToPx(margins.bottom);
  const padLeft = inchToPx(margins.left);
  const padRight = inchToPx(margins.right);
  const contentHeightPx = Math.max(100, pageHeightPx - padTop - padBottom);

  // Migrate legacy content once on mount.
  const seedHtml = useMemo(() => {
    const m = migrateLegacyContent(initialContent || '');
    return m.value;
  }, [canvas.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pages array — used in any paginated mode (side-to-side OR single+multiple).
  const [pages, setPages] = useState(() => {
    if (Array.isArray(initialPages) && initialPages.length) return initialPages;
    return [seedHtml];
  });

  const setPagesAndNotify = useCallback((next) => {
    const computed = typeof next === 'function' ? next(pages) : next;
    setPages(computed);
    onPagesChange?.(computed);
  }, [pages, onPagesChange]);

  // Continuous single-mode editor state.
  const verticalEditorRef = useRef(null);
  const pageEditorsRef = useRef({});
  const [activeEditor, setActiveEditor] = useState(null);

  useImperativeHandle(ref, () => ({
    getActiveEditor: () => activeEditor,
    getVerticalEditor: () => verticalEditorRef.current,
    getPageEditor: (idx) => pageEditorsRef.current[idx] || null,
  }), [activeEditor]);

  useEffect(() => {
    onActiveEditorChange?.(activeEditor);
  }, [activeEditor, onActiveEditorChange]);

  // Continuous single mode — single editor, scrolling tower of frames.
  if (isContinuousSingle) {
    return (
      <div className="canvas-tiptap-wrapper page-mode flex-1">
        <style>{TIPTAP_BASE_CSS}</style>
        <ContinuousSingleEditor
          seedHtml={seedHtml}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          setup={setup}
          padTop={padTop}
          padBottom={padBottom}
          padLeft={padLeft}
          padRight={padRight}
          onUpdate={(html, ed) => {
            verticalEditorRef.current = ed;
            onContentChange?.(html);
          }}
          onReady={(ed) => {
            verticalEditorRef.current = ed;
            if (!activeEditor) setActiveEditor(ed);
          }}
          onFocus={(ed) => setActiveEditor(ed)}
        />
      </div>
    );
  }

  // ── Paginated modes ────────────────────────────────────────────────────
  return (
    <PaginatedEditor
      mode={isSideToSide ? 'spreads' : 'single-paginated'}
      setup={setup}
      pages={pages}
      onPagesChange={setPagesAndNotify}
      pageWidthPx={pageWidthPx}
      pageHeightPx={pageHeightPx}
      padTop={padTop}
      padBottom={padBottom}
      padLeft={padLeft}
      padRight={padRight}
      contentHeightPx={contentHeightPx}
      registerEditor={(idx, ed) => {
        pageEditorsRef.current[idx] = ed;
      }}
      onFocus={(ed) => setActiveEditor(ed)}
    />
  );
});

// ── Continuous single editor (legacy v0.5.0 behaviour) ────────────────────
function ContinuousSingleEditor({
  seedHtml,
  pageWidthPx,
  pageHeightPx,
  setup,
  padTop,
  padBottom,
  padLeft,
  padRight,
  onUpdate,
  onReady,
  onFocus,
}) {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const ed = editorRef.current;
      if (!ed?.view?.dom) return;
      const contentH = ed.view.dom.scrollHeight;
      const next = Math.max(1, Math.ceil(contentH / pageHeightPx));
      setPageCount((prev) => (prev !== next ? next : prev));
    };
    const tick = () => { measure(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pageHeightPx]);

  return (
    <div ref={wrapperRef} className="relative mx-auto" style={{ width: pageWidthPx }}>
      {/* Stacked visual page-frames behind the editor */}
      <div className="absolute inset-x-0 top-0 pointer-events-none">
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * (pageHeightPx + 24),
              left: 0,
              width: pageWidthPx,
            }}
          >
            <PageFrame setup={setup} pageIndex={i} live={i === 0} number={i + 1} />
          </div>
        ))}
      </div>

      <div
        className="relative z-10"
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          color: 'hsl(220, 30%, 12%)',
          minHeight: pageHeightPx,
        }}
      >
        <PageEditor
          seedHtml={seedHtml}
          placeholder=""
          ariaLabel="Canvas (vertical)"
          pageIndex={0}
          onUpdate={(html, ed) => { editorRef.current = ed; onUpdate?.(html, ed); }}
          onReady={(ed) => { editorRef.current = ed; onReady?.(ed); }}
          onFocus={onFocus}
          onMeasure={() => {}}
        />
      </div>

      {/* Page-break indicators every pageHeightPx (visual cue) */}
      {Array.from({ length: pageCount - 1 }).map((_, i) => (
        <div
          key={`break-${i}`}
          className="pointer-events-none absolute left-0 right-0"
          style={{
            top: (i + 1) * pageHeightPx,
            height: 24,
            background: 'hsl(220, 12%, 9%)',
            borderTop: '1px dashed hsl(220, 8%, 32%)',
            borderBottom: '1px dashed hsl(220, 8%, 32%)',
            zIndex: 5,
          }}
        />
      ))}
    </div>
  );
}

// ── Paginated editor — N page-editor instances + overflow controller ─────
// `mode`:
//   'single-paginated' — vertical scroll, one page per row, overflow spawns new pages
//   'spreads'          — fit-to-viewport spread of two pages, horizontal nav
function PaginatedEditor({
  mode,
  setup,
  pages,
  onPagesChange,
  pageWidthPx,
  pageHeightPx,
  padTop,
  padBottom,
  padLeft,
  padRight,
  contentHeightPx,
  registerEditor,
  onFocus,
}) {
  const { onMeasure } = usePaginationController({
    pages,
    setPages: onPagesChange,
    contentHeightPx,
    isPaginated: true,
  });

  const updatePage = useCallback((idx, html) => {
    // Avoid re-emitting if no actual change (prevents migration-induced loops).
    if (pages[idx] === html) return;
    const next = pages.slice();
    next[idx] = html;
    onPagesChange(next);
  }, [pages, onPagesChange]);

  const renderPage = useCallback((idx, isLive = true) => {
    const html = pages[idx] ?? '';
    return (
      <PageFrame
        setup={setup}
        pageIndex={idx}
        live={isLive}
        number={idx + 1}
        fixedHeight={pageHeightPx}
      >
        <div
          className="canvas-tiptap-wrapper page-mode"
          style={{
            // PageFrame's .page-content already applies the margin padding;
            // re-applying it here was double-padding the editor and visually
            // centering the text. Just fill the writable area.
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
            color: 'hsl(220, 30%, 12%)',
          }}
        >
          <PageEditor
            seedHtml={html}
            placeholder={idx === 0 ? '' : ''}
            ariaLabel={`Canvas page ${idx + 1}`}
            pageIndex={idx}
            onUpdate={(newHtml, ed) => { registerEditor(idx, ed); updatePage(idx, newHtml); }}
            onReady={(ed) => { registerEditor(idx, ed); }}
            onFocus={onFocus}
            onMeasure={onMeasure}
          />
        </div>
      </PageFrame>
    );
  }, [pages, setup, pageHeightPx, padTop, padBottom, padLeft, padRight, registerEditor, updatePage, onFocus, onMeasure]);

  if (mode === 'spreads') {
    return (
      <SpreadsLayout
        pages={pages}
        renderPage={renderPage}
        setup={setup}
        pageWidthPx={pageWidthPx}
        pageHeightPx={pageHeightPx}
      />
    );
  }

  // single-paginated
  return (
    <SinglePaginatedLayout
      pages={pages}
      renderPage={renderPage}
      pageWidthPx={pageWidthPx}
      pageHeightPx={pageHeightPx}
    />
  );
}

// ── Side-to-Side spreads layout (fit-to-viewport, horizontal scroll) ─────
function SpreadsLayout({ pages, renderPage, setup, pageWidthPx, pageHeightPx }) {
  const [spreadIndex, setSpreadIndex] = useState(0);

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  // Keep spread index in range when pages shrink.
  useEffect(() => {
    setSpreadIndex((s) => Math.min(s, totalSpreads - 1));
  }, [totalSpreads]);

  const leftIdx = spreadIndex * 2 - 1;
  const rightIdx = spreadIndex * 2;
  const isFirst = spreadIndex === 0;

  // Wheel/keyboard nav.
  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      wheelAccum.current += e.deltaX;
    } else {
      wheelAccum.current += e.deltaY;
    }
    if (wheelAccum.current > 60) {
      setSpreadIndex((s) => Math.min(s + 1, totalSpreads - 1));
      wheelAccum.current = 0;
      e.preventDefault();
    } else if (wheelAccum.current < -60) {
      setSpreadIndex((s) => Math.max(s - 1, 0));
      wheelAccum.current = 0;
      e.preventDefault();
    }
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => { wheelAccum.current = 0; }, 200);
  };

  // Fit-to-viewport scaling — always fits the spread to the available
  // scene height (and width), so no vertical scroll inside a spread.
  const sceneRef = useRef(null);
  const SPINE_GAP_PX = 4;
  const spreadWidth = pageWidthPx * 2 + SPINE_GAP_PX;
  const spreadHeight = pageHeightPx;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recompute = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const availH = scene.clientHeight - 48;
      const availW = scene.clientWidth - 48;
      const sH = availH / spreadHeight;
      const sW = availW / spreadWidth;
      const next = Math.max(0.2, Math.min(sH, sW, 1.4));
      setScale((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (sceneRef.current) ro.observe(sceneRef.current);
    window.addEventListener('resize', recompute);
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
  }, [spreadWidth, spreadHeight]);

  return (
    <div
      className="flex-1 relative flex flex-col overflow-hidden"
      style={{ background: 'hsl(220, 12%, 9%)' }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' && spreadIndex > 0) setSpreadIndex(spreadIndex - 1);
        if (e.key === 'ArrowRight' && spreadIndex < totalSpreads - 1) setSpreadIndex(spreadIndex + 1);
      }}
    >
      <style>{TIPTAP_BASE_CSS}</style>

      <div
        ref={sceneRef}
        className="flex-1 relative overflow-hidden"
        onWheel={onWheel}
        style={{ zIndex: 2 }}
      >
        {/* Hidden mount-host: every page editor lives here as long as it's
            in `pages[]`, so off-screen pages still measure and migrate. We
            move the visible ones into the spread via portal-like absolute
            positioning of their wrappers (using `display:none` for the
            non-visible ones keeps measurement alive — display:none does NOT
            zero scrollHeight on a contenteditable body in modern browsers,
            it just hides paint). */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              transition: 'transform 120ms ease-out',
            }}
          >
            <div className="flex items-start justify-center gap-1 relative">
              {/* Spine shadow */}
              <div
                className="absolute inset-y-0 pointer-events-none"
                style={{
                  left: '50%',
                  width: 24,
                  transform: 'translateX(-50%)',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4), transparent 70%)',
                  zIndex: 1,
                }}
              />
              {/* Render ALL pages — the visible two are positioned in the
                  flex flow, the rest are absolutely positioned outside the
                  viewport so they still mount and measure but don't paint. */}
              {pages.map((_, idx) => {
                const isVisibleLeft = !isFirst && idx === leftIdx;
                const isVisibleRight = idx === rightIdx;
                const isVisible = isVisibleLeft || isVisibleRight;
                const visibleOrder = isVisibleLeft ? 0 : (isVisibleRight ? 1 : -1);
                const wrapperStyle = isVisible
                  ? { order: visibleOrder, width: pageWidthPx, height: pageHeightPx }
                  : {
                      position: 'absolute',
                      left: -99999,
                      top: 0,
                      width: pageWidthPx,
                      height: pageHeightPx,
                      pointerEvents: 'none',
                      opacity: 0,
                    };
                return (
                  <div key={`page-${idx}`} style={wrapperStyle}>
                    {renderPage(idx, true)}
                  </div>
                );
              })}
              {/* Cover decorative page on first spread (left side) */}
              {isFirst && (
                <div style={{ order: 0, width: pageWidthPx, height: pageHeightPx }}>
                  <PageFrame setup={setup} pageIndex={1} live={false} number={null} fixedHeight={pageHeightPx} />
                </div>
              )}
              {/* Placeholder right page when only one real page exists (so spread looks balanced). */}
              {rightIdx >= pages.length && (
                <div style={{ order: 1, width: pageWidthPx, height: pageHeightPx }}>
                  <PageFrame setup={setup} pageIndex={rightIdx} live={false} number={null} fixedHeight={pageHeightPx} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spread navigation footer */}
      <div className="px-3 py-1.5 flex items-center justify-center gap-3 border-t border-[hsl(var(--chalk-white-faint)/0.15)] bg-[hsl(var(--chalk-deep)/0.55)] shrink-0" style={{ zIndex: 3 }}>
        <button
          onClick={() => setSpreadIndex((s) => Math.max(0, s - 1))}
          disabled={spreadIndex === 0}
          className="text-xs font-mono text-[hsl(220,7%,55%)] hover:text-[hsl(var(--chalk-yellow))] disabled:opacity-30 transition-colors"
        >
          ◀ Prev
        </button>
        <span className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,50%)] font-mono">
          Spread {spreadIndex + 1} / {totalSpreads}
        </span>
        <button
          onClick={() => setSpreadIndex((s) => Math.min(totalSpreads - 1, s + 1))}
          disabled={spreadIndex >= totalSpreads - 1}
          className="text-xs font-mono text-[hsl(220,7%,55%)] hover:text-[hsl(var(--chalk-yellow))] disabled:opacity-30 transition-colors"
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}

// ── Single Paginated layout (vertical stack of N pages, vertical scroll) ─
function SinglePaginatedLayout({ pages, renderPage, pageWidthPx, pageHeightPx }) {
  return (
    <div
      className="flex-1 relative flex flex-col overflow-hidden"
      style={{ background: 'hsl(220, 12%, 9%)' }}
    >
      <style>{TIPTAP_BASE_CSS}</style>
      <div className="flex-1 relative overflow-auto">
        <div
          className="flex flex-col items-center gap-6 py-8 px-12 mx-auto"
          style={{ minHeight: '100%' }}
        >
          {pages.map((_, idx) => (
            <div
              key={idx}
              style={{ width: pageWidthPx, height: pageHeightPx }}
            >
              {renderPage(idx, true)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TiptapPagedEditor;
