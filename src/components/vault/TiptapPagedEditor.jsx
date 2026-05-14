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
  onSelectAllAcross,
}) {
  // Stash the latest onSelectAllAcross in a ref so the editor's keydown
  // handler — captured once at editor-construction time — always sees the
  // current callback even if the parent re-renders with a new closure.
  const selectAllRef = useRef(onSelectAllAcross);
  useEffect(() => { selectAllRef.current = onSelectAllAcross; }, [onSelectAllAcross]);

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
      // v0.5.81 — Spread/multi-page select-all. In paginated modes each page
      // has its own Tiptap instance, so the default Cmd/Ctrl+A only selects
      // text on the focused page. Intercept it and let the parent fan-out
      // a selectAll across every page editor in the registry. The callback
      // returns true if it handled the key (signalling the parent did the
      // multi-editor select-all and we shouldn't run the default).
      handleKeyDown(view, event) {
        const isMod = event.metaKey || event.ctrlKey;
        const isA = event.key === 'a' || event.key === 'A' || event.code === 'KeyA';
        if (isMod && isA && !event.altKey && !event.shiftKey) {
          const cb = selectAllRef.current;
          if (cb && cb(pageIndex) === true) {
            event.preventDefault();
            return true;
          }
        }
        return false;
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

  // v0.6.95-alpha.7 — Natural content height (NOT scrollHeight).
  //
  // Regression context: the editor DOM (`.tiptap`) carries `min-height: 100%`
  // (see TIPTAP_BASE_CSS) so clicking the empty page area below the last
  // paragraph still focuses the editor — UX requirement preserved from v0.5.x.
  // Side effect: `dom.scrollHeight` is CLAMPED UP to the page's writable
  // area height. That works fine for the OVERFLOW pass (real overflow still
  // pushes scrollHeight past the clamp), but it BREAKS the UNDERFLOW pass:
  // a tiny one-block page reports scrollHeight === contentHeightPx → `room`
  // computes as 0 → no pull-back happens, ever.
  //
  // The visible bug (filed by Alaria, alpha.6→alpha.7): activating Quillginate
  // on an existing multi-block doc runs `splitDocToBlocks` which seeds the
  // pages array with one top-level block per page. The underflow pass should
  // immediately reflow them back together, but with clamped scrollHeight it
  // never could — so every block stayed on its own page with vast empty
  // space below it. Pre-Alpha 3 this didn't trip because Quillginate didn't
  // auto-split on activate.
  //
  // Fix: report the NATURAL block-content height — measured from the top of
  // the first block to the bottom of the last block (including their margins),
  // which is independent of the parent's min-height. Empty editor falls back
  // to 0 (forces the underflow pass to pull blocks back from the next page).
  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    let lastReported = -1;
    const tick = () => {
      const dom = editor.view?.dom;
      if (dom) {
        const h = measureNaturalContentHeight(dom);
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

// v0.6.95-alpha.7 — Natural content height, independent of parent min-height.
//
// Returns the pixel span from the top of the first child block to the bottom
// of the last child block, plus the first child's collapsed top margin and
// the last child's collapsed bottom margin (since getBoundingClientRect()
// excludes margins). For an empty editor returns 0.
//
// This deliberately ignores the editor DOM's own min-height: 100% — that
// rule is a UX affordance (so clicking the empty page area focuses the
// editor) and must not influence overflow/underflow detection. Using
// scrollHeight would inherit the clamp and break the underflow pass.
function measureNaturalContentHeight(dom) {
  if (!dom) return 0;
  const children = dom.children;
  if (!children || children.length === 0) return 0;
  const first = children[0];
  const last = children[children.length - 1];
  const firstRect = first.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  // Add margins on the outer edges (block margins on inner children collapse
  // naturally into the rect span, so we only need the outer two).
  let topMargin = 0;
  let bottomMargin = 0;
  try {
    const cs1 = window.getComputedStyle(first);
    const cs2 = window.getComputedStyle(last);
    topMargin = parseFloat(cs1.marginTop) || 0;
    bottomMargin = parseFloat(cs2.marginBottom) || 0;
  } catch { /* ignore — SSR/jsdom fallback */ }
  const span = (lastRect.bottom - firstRect.top) + topMargin + bottomMargin;
  // Floor to avoid sub-pixel oscillation triggering the RAF loop.
  return Math.max(0, Math.round(span));
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

// v0.6.95-Alpha3 — hard page break helpers.
//
// A hard page break marker is `<hr class="hard-page-break" ...>` inserted
// by the HardPageBreak Tiptap extension (Mod-Enter). We detect it by
// checking the literal block HTML for that class.
function isHardPageBreak(blockHtml) {
  if (typeof blockHtml !== 'string') return false;
  // Cheap match — the class is always set verbatim by the extension's
  // renderHTML. We don't need a full DOM parse for this hot path.
  return /<hr\b[^>]*class="[^"]*hard-page-break/.test(blockHtml);
}

// Returns the index of the first hard-break block in `blocks`, or -1.
function findHardBreakIndex(blocks) {
  for (let i = 0; i < blocks.length; i++) {
    if (isHardPageBreak(blocks[i])) return i;
  }
  return -1;
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

  // v0.6.95-Alpha3 — Forced-break detection is independent of scrollHeight.
  // The RAF measurement loop in PageEditor only fires `onMeasure` when
  // scrollHeight changes, which is the right gate for overflow/underflow
  // passes but the WRONG gate for forced page breaks: a writer can press
  // Mod-Enter without changing the page's pixel height, and we'd never
  // schedule a rebalance. To cover that case, schedule a rebalance whenever
  // the `pages` array reference changes (any content edit).
  useEffect(() => {
    if (!isPaginated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runRebalance();
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, isPaginated]);

  function runRebalance() {
    const current = pagesRef.current;
    if (!Array.isArray(current) || current.length === 0) return;
    const heights = heightsRef.current;
    const SLACK = 4;

    // 0) FORCED BREAK pass — v0.6.95-Alpha3.
    //
    // If any page contains a hard-page-break marker that isn't at its
    // very end, split the page at the marker: the marker (and the empty
    // paragraph it ships with) closes out the current page, and every
    // block after it moves to the next page. This pass runs ONCE per
    // tick and short-circuits before overflow/underflow run, exactly
    // like the existing migration passes.
    for (let i = 0; i < current.length; i++) {
      const blocks = splitTopLevelBlocks(current[i]);
      const hardIdx = findHardBreakIndex(blocks);
      // No marker, or marker is at the tail (already serving as a page
      // terminator) — nothing to do.
      if (hardIdx === -1) continue;
      if (hardIdx >= blocks.length - 1) continue;

      // Keep everything up to and including the marker on page i.
      // The marker stays on page i so the user can see/select it on
      // the page it terminates. The block immediately after the
      // marker leads page i+1.
      const keep = blocks.slice(0, hardIdx + 1);
      const move = blocks.slice(hardIdx + 1);

      const next = current.slice();
      next[i] = joinTopLevelBlocks(keep);

      if (i + 1 < next.length) {
        if (isPageEffectivelyEmpty(next[i + 1])) {
          next[i + 1] = joinTopLevelBlocks(move);
        } else {
          const nextBlocks = splitTopLevelBlocks(next[i + 1]);
          next[i + 1] = joinTopLevelBlocks(move) + joinTopLevelBlocks(nextBlocks);
        }
      } else {
        next.push(joinTopLevelBlocks(move));
      }
      setPages(next);
      return;
    }

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
        // v0.6.95-Alpha3 — if the trailing block is a hard-page-break marker,
        // we can't migrate it (that would move the writer's committed break).
        // Pull the block BEFORE the marker instead, leaving the marker as the
        // page terminator on page i.
        let lastBlock;
        if (isHardPageBreak(blocks[blocks.length - 1])) {
          if (blocks.length < 2) continue; // only the marker remains — nothing to migrate.
          const marker = blocks.pop();
          lastBlock = blocks.pop();
          blocks.push(marker);
        } else {
          lastBlock = blocks.pop();
        }
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

      // v0.6.95-Alpha3 — never pull across a hard page break. If page i
      // ends in a hard-break marker, the writer has committed to ending
      // the page there. Respect that even when there's room to spare.
      const myBlocksGuard = splitTopLevelBlocks(current[i]);
      const lastOfMine = myBlocksGuard[myBlocksGuard.length - 1];
      if (isHardPageBreak(lastOfMine || '')) continue;

      const nextBlocks = splitTopLevelBlocks(current[i + 1]);
      if (nextBlocks.length === 0) continue;
      // Don't pull if the next page only has one empty paragraph.
      if (isPageEffectivelyEmpty(current[i + 1])) continue;
      // Don't pull if the next page leads with the trailing paragraph
      // belonging to a hard break — i.e. the very first block on i+1
      // is itself the hard-break marker (shouldn't happen because the
      // FORCED BREAK pass keeps the marker on page i, but guard anyway).
      if (isHardPageBreak(nextBlocks[0] || '')) continue;

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
    // v0.5.81 — ordered list of all live page editors (paginated modes
    // only — returns [verticalEditor] when in continuous-single mode).
    // Used by ParagraphDialog to fan paragraph formats out across pages
    // when the user has done a cross-page Select-All.
    getAllEditors: () => {
      const map = pageEditorsRef.current || {};
      const indices = Object.keys(map).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
      const list = indices.map((i) => map[i]).filter(Boolean);
      if (list.length) return list;
      return verticalEditorRef.current ? [verticalEditorRef.current] : [];
    },
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
  // Track which page editor is currently active (focused or last edited)
  // — used by SpreadsLayout for caret-follow auto-scroll.
  const [activePageIndex, setActivePageIndex] = useState(0);
  const pageEditorsLocalRef = useRef({});

  // Hook into the migration controller and detect page-spawn events so we
  // can transfer focus to the newly-spawned page (Word-style cursor follow).
  const prevPagesLengthRef = useRef(pages.length);
  const lastFocusedPageRef = useRef(0);

  const { onMeasure } = usePaginationController({
    pages,
    setPages: onPagesChange,
    contentHeightPx,
    isPaginated: true,
  });

  // After a pages-array grows (new page spawned by overflow), if the user
  // was focused on the now-second-to-last page, transfer focus to the new
  // last page at its start. This makes typing past page N's bottom feel
  // like Word: caret continues writing on page N+1.
  useEffect(() => {
    const prev = prevPagesLengthRef.current;
    const cur = pages.length;
    if (cur > prev) {
      // Page(s) added. The migration only ever spawns ONE new page per
      // tick, and only at the end of the array. If the focused page is
      // the page that just lost its tail block (cur - 2), advance focus
      // to the new page (cur - 1) at its start.
      const focused = lastFocusedPageRef.current;
      if (focused === cur - 2 || focused === cur - 1) {
        const newIdx = cur - 1;
        // setTimeout 0 — defer until React commits the new editor.
        setTimeout(() => {
          const ed = pageEditorsLocalRef.current[newIdx];
          if (ed) {
            ed.commands.focus('start');
            setActivePageIndex(newIdx);
            lastFocusedPageRef.current = newIdx;
          }
        }, 0);
      }
    }
    prevPagesLengthRef.current = cur;
  }, [pages.length]);

  const updatePage = useCallback((idx, html) => {
    // Avoid re-emitting if no actual change (prevents migration-induced loops).
    if (pages[idx] === html) return;
    const next = pages.slice();
    next[idx] = html;
    onPagesChange(next);
  }, [pages, onPagesChange]);

  const handlePageFocus = useCallback((ed, idx) => {
    lastFocusedPageRef.current = idx;
    setActivePageIndex(idx);
    onFocus?.(ed);
  }, [onFocus]);

  const handleRegisterEditor = useCallback((idx, ed) => {
    pageEditorsLocalRef.current[idx] = ed;
    registerEditor(idx, ed);
  }, [registerEditor]);

  // v0.5.81 — Cross-page select-all. When Cmd/Ctrl+A fires on any page
  // editor, run selectAll on EVERY editor in the registry so the highlight
  // visually spans the whole document (matching Word / single-editor
  // behavior). Subsequent format/paragraph commands can fan out to all
  // editors via a parent callback (see selectAllAcrossPages on the ref).
  const handleSelectAllAcrossPages = useCallback((focusedIdx) => {
    const map = pageEditorsLocalRef.current || {};
    const indices = Object.keys(map).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    if (indices.length <= 1) return false; // single page — let default run
    indices.forEach((i) => {
      const ed = map[i];
      if (!ed || ed.isDestroyed) return;
      try { ed.commands.selectAll(); } catch { /* ignore */ }
    });
    // Keep the originally-focused page as the active one so the caret/
    // formatting toolbar still has a sensible anchor.
    const anchor = map[focusedIdx];
    if (anchor && !anchor.isDestroyed) {
      // selectAll already ran on it; just make sure focus stays put.
      anchor.view?.focus?.();
    }
    return true;
  }, []);

  // Imperative — expose page-editor registry to parent (TiptapPagedEditor)
  // so it can fan out paragraph-format ops, ruler measurements, etc.
  // Mirrors the v0.4.x "all-editors" hook shape.
  // Note: this is set up via the parent's `registerEditor(idx, ed)` callback
  // already; this is just a convenience getter.

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
            onUpdate={(newHtml, ed) => { handleRegisterEditor(idx, ed); updatePage(idx, newHtml); }}
            onReady={(ed) => { handleRegisterEditor(idx, ed); }}
            onFocus={(ed) => handlePageFocus(ed, idx)}
            onMeasure={onMeasure}
            onSelectAllAcross={handleSelectAllAcrossPages}
          />
        </div>
      </PageFrame>
    );
  }, [pages, setup, pageHeightPx, padTop, padBottom, padLeft, padRight, handleRegisterEditor, updatePage, handlePageFocus, onMeasure]);

  if (mode === 'spreads') {
    return (
      <SpreadsLayout
        pages={pages}
        renderPage={renderPage}
        setup={setup}
        pageWidthPx={pageWidthPx}
        pageHeightPx={pageHeightPx}
        activePageIndex={activePageIndex}
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
// v0.5.71 — Word-style sliding strip:
//   • Render all spreads in one wide horizontal strip
//   • Translate the strip by -spreadIndex * (spreadW + gap) with a
//     cubic-bezier(0.22, 0.61, 0.36, 1) ease over 320ms (matches Word's
//     page-flip pacing closely)
//   • All pages stay mounted and measure normally (no -99999 hack)
//   • Caret-follow: when active page index changes, advance/rewind
//     spread to the spread containing it
function SpreadsLayout({
  pages,
  renderPage,
  setup,
  pageWidthPx,
  pageHeightPx,
  activePageIndex,
}) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [animEnabled, setAnimEnabled] = useState(false);

  // Spread layout:
  //   spread 0  = { cover, page 0 }
  //   spread N  = { page (2N - 1), page (2N) } for N ≥ 1
  // So with P pages, total spreads = ceil((P + 1) / 2). With P=1 we get 1
  // spread (cover+p0). With P=2 we get 2 spreads (cover+p0, p1+ph). Etc.
  const totalSpreads = Math.max(1, Math.ceil((pages.length + 1) / 2));
  // Keep spread index in range when pages shrink.
  useEffect(() => {
    setSpreadIndex((s) => Math.min(s, totalSpreads - 1));
  }, [totalSpreads]);

  // Spread layout: spread 0 is { cover, page0 }; spread N (N≥1) is
  // { page (2N-1), page (2N) }. Compute which spread a given page index
  // falls into so we can implement caret-follow.
  const spreadOfPage = (pageIdx) => {
    if (pageIdx <= 0) return 0;
    return Math.ceil(pageIdx / 2);
  };

  // Caret-follow: when a different page becomes active (focused or
  // newly spawned by overflow), slide to the spread containing it.
  useEffect(() => {
    if (activePageIndex == null || activePageIndex < 0) return;
    const target = Math.min(spreadOfPage(activePageIndex), totalSpreads - 1);
    setSpreadIndex((cur) => (cur !== target ? target : cur));
  }, [activePageIndex, totalSpreads]);

  // Enable transitions only AFTER the first paint so the initial render
  // doesn't slide in from off-screen.
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimEnabled(true));
    return () => cancelAnimationFrame(t);
  }, []);

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
  const SPREAD_GAP_PX = 64; // gap between adjacent spreads in the strip
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

  // Build the spread descriptors. Each spread = [leftPageIdx | null,
  // rightPageIdx | null]. Spread 0 has a decorative cover on the left.
  const spreadDescriptors = [];
  for (let s = 0; s < totalSpreads; s++) {
    if (s === 0) {
      spreadDescriptors.push({ left: 'cover', right: 0 in pages ? 0 : 'placeholder' });
    } else {
      const li = s * 2 - 1;
      const ri = s * 2;
      spreadDescriptors.push({
        left: li < pages.length ? li : 'placeholder',
        right: ri < pages.length ? ri : 'placeholder',
      });
    }
  }

  // Translate the strip by -spreadIndex * (spreadWidth + SPREAD_GAP).
  // The strip is centered horizontally inside the scaled wrapper, so
  // start with a translateX that puts spread 0 at center, then offset
  // by spreadIndex.
  const stripOffset = -spreadIndex * (spreadWidth + SPREAD_GAP_PX);

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
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Scale wrapper — fits one spread to the viewport */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              transition: 'transform 120ms ease-out',
            }}
          >
            {/* Strip wrapper — fixed width = spreadWidth, clips the strip
                so adjacent spreads (rendered side-by-side in the strip)
                stay invisible until the strip slides them into view.
                Off-screen spreads stay mounted so the overflow controller
                can keep measuring and migrating them in the background. */}
            <div
              style={{
                width: spreadWidth,
                height: spreadHeight,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPREAD_GAP_PX,
                  transform: `translateX(${stripOffset}px)`,
                  transition: animEnabled
                    ? 'transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)'
                    : 'none',
                  willChange: 'transform',
                }}
              >
                {spreadDescriptors.map((sd, sIdx) => (
                  <div
                    key={`spread-${sIdx}`}
                    style={{
                      width: spreadWidth,
                      height: spreadHeight,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {/* Spine shadow */}
                    <div
                      className="absolute inset-y-0 pointer-events-none"
                      style={{
                        left: '50%',
                        width: 24,
                        transform: 'translateX(-50%)',
                        background:
                          'radial-gradient(ellipse at center, rgba(0,0,0,0.4), transparent 70%)',
                        zIndex: 1,
                      }}
                    />
                    <div
                      className="flex items-start justify-center gap-1 relative"
                      style={{ width: spreadWidth, height: spreadHeight }}
                    >
                      {/* LEFT slot */}
                      <div style={{ width: pageWidthPx, height: pageHeightPx }}>
                        {sd.left === 'cover' ? (
                          <PageFrame
                            setup={setup}
                            pageIndex={1}
                            live={false}
                            number={null}
                            fixedHeight={pageHeightPx}
                          />
                        ) : sd.left === 'placeholder' ? (
                          <PageFrame
                            setup={setup}
                            pageIndex={sIdx * 2 - 1}
                            live={false}
                            number={null}
                            fixedHeight={pageHeightPx}
                          />
                        ) : (
                          renderPage(sd.left, true)
                        )}
                      </div>
                      {/* RIGHT slot */}
                      <div style={{ width: pageWidthPx, height: pageHeightPx }}>
                        {sd.right === 'placeholder' ? (
                          <PageFrame
                            setup={setup}
                            pageIndex={sIdx * 2}
                            live={false}
                            number={null}
                            fixedHeight={pageHeightPx}
                          />
                        ) : (
                          renderPage(sd.right, true)
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spread navigation footer */}
      <div
        className="px-3 py-1.5 flex items-center justify-center gap-3 border-t border-[hsl(var(--chalk-white-faint)/0.15)] bg-[hsl(var(--chalk-deep)/0.55)] shrink-0"
        style={{ zIndex: 3 }}
      >
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
