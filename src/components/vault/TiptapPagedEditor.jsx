// TiptapPagedEditor — replaces the v0.4.x ReactQuill instance. Owns one or
// more Tiptap editors depending on the current page-movement mode:
//
//   • Vertical:   one editor instance hosting the entire document. Page
//                 frames render as a continuous tower above the editor's
//                 absolute-positioned column. Visually paginated, content
//                 flow is one continuous editor (best the v0.5.0 ship can
//                 honestly do without a real flow extension).
//
//   • Side-to-Side: each page is its own Tiptap editor instance with its
//                 own HTML segment. Caret jumps between them on click. The
//                 spread tracks page index just like v0.4.x.
//
// Storage model (canvas entity):
//   - `content`  → the v0.4.x field. In v0.5.0 vertical mode it stays as the
//                  single source of truth.
//   - `pages`    → optional array of HTML segments. Populated when the user
//                  opens side-to-side and adds pages. If `pages` is missing,
//                  we initialize it to [content || ''] on first edit in
//                  side-to-side mode.
//
// The component takes a single `setActiveAdapter(adapter)` callback so the
// parent (CanvasEditor) wires its quillRef to whichever editor is focused.
// CanvasRuler / HeaderNavigator / Toolbar all keep their existing
// quillRef-based API thanks to this adapter pattern.

import { useEffect, useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { buildExtensions, TIPTAP_BASE_CSS } from '@/lib/tiptap/editorConfig';
import { migrateLegacyContent } from '@/lib/tiptap/migrateContent';
import { effectiveDimensions, inchToPx, resolvedMargins } from '@/lib/pageSetup';
import PageFrame from './PageFrame';
import { Plus } from 'lucide-react';

// ── Single Tiptap editor wrapped to expose focus/blur events ──────────────
function PageEditor({
  initialHtml,
  placeholder,
  onUpdate,
  onFocus,
  onReady,
  ariaLabel,
}) {
  const editor = useEditor({
    extensions: buildExtensions({ placeholder }),
    content: initialHtml || '',
    onUpdate({ editor }) {
      onUpdate?.(editor.getHTML(), editor);
    },
    onFocus({ editor }) {
      onFocus?.(editor);
    },
    editorProps: {
      attributes: {
        'aria-label': ariaLabel || 'Canvas page',
        spellcheck: 'true',
      },
    },
  });

  useEffect(() => {
    if (editor) onReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return <EditorContent editor={editor} className="h-full" />;
}

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

  const dims = effectiveDimensions(setup);
  const pageWidthPx = inchToPx(dims.width);
  const pageHeightPx = inchToPx(dims.height);

  // Migrate legacy content once on mount.
  const seedHtml = useMemo(() => {
    const m = migrateLegacyContent(initialContent || '');
    return m.value;
  }, [canvas.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pages array — only used in side-to-side mode. Initialized from props or
  // from the seed HTML when the user first switches to side-to-side.
  const [pages, setPages] = useState(() => {
    if (Array.isArray(initialPages) && initialPages.length) return initialPages;
    return [seedHtml];
  });

  // Vertical mode editor reference (single instance).
  const verticalEditorRef = useRef(null);
  // Side-to-side editor references (one per page index).
  const pageEditorsRef = useRef({});
  // The currently focused editor — adapter source of truth.
  const [activeEditor, setActiveEditor] = useState(null);

  useImperativeHandle(ref, () => ({
    getActiveEditor: () => activeEditor,
    getVerticalEditor: () => verticalEditorRef.current,
    getPageEditor: (idx) => pageEditorsRef.current[idx] || null,
  }), [activeEditor]);

  useEffect(() => {
    onActiveEditorChange?.(activeEditor);
  }, [activeEditor, onActiveEditorChange]);

  // ── Vertical mode ──────────────────────────────────────────────────────
  if (!isSideToSide) {
    return (
      <div className="canvas-tiptap-wrapper page-mode flex-1">
        <style>{TIPTAP_BASE_CSS}</style>
        <VerticalPagedEditor
          seedHtml={seedHtml}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          setup={setup}
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

  // ── Side-to-side mode ──────────────────────────────────────────────────
  return (
    <SideToSideEditor
      setup={setup}
      pages={pages}
      onPagesChange={(next) => { setPages(next); onPagesChange?.(next); }}
      pageWidthPx={pageWidthPx}
      pageHeightPx={pageHeightPx}
      registerEditor={(idx, ed) => { pageEditorsRef.current[idx] = ed; }}
      onFocus={(ed) => setActiveEditor(ed)}
    />
  );
});

// ── Vertical mode body ────────────────────────────────────────────────────
function VerticalPagedEditor({
  seedHtml,
  pageWidthPx,
  pageHeightPx,
  setup,
  onUpdate,
  onReady,
  onFocus,
}) {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);

  // Compute how many page-frames to render based on the editor's actual
  // content height. This is the "visual pagination" — the editor itself is
  // one continuous column, and we stack visual page-frames under it sized
  // to the content. Better than the v0.4.x phantom pages because the count
  // grows naturally with content.
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

  const showMultiple = setup.pageLayout === 'multiple';
  const margins = resolvedMargins(setup, 0);
  const padTop = inchToPx(margins.top);
  const padBottom = inchToPx(margins.bottom);
  const padLeft = inchToPx(margins.left);
  const padRight = inchToPx(margins.right);

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto"
      style={{ width: pageWidthPx }}
    >
      {/* Stacked visual page-frames behind the editor */}
      {showMultiple && (
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
      )}

      {/* The actual editor — sits on top, padded to match page margins. */}
      <div
        className="relative z-10"
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          background: showMultiple ? 'transparent' : 'hsl(0, 0%, 96%)',
          color: 'hsl(220, 30%, 12%)',
          minHeight: pageHeightPx,
        }}
      >
        <PageEditor
          initialHtml={seedHtml}
          placeholder=""
          ariaLabel="Canvas (vertical)"
          onUpdate={(html, ed) => { editorRef.current = ed; onUpdate?.(html, ed); }}
          onReady={(ed) => { editorRef.current = ed; onReady?.(ed); }}
          onFocus={onFocus}
        />
      </div>

      {/* Page-break indicators every pageHeightPx (visual cue) */}
      {showMultiple && Array.from({ length: pageCount - 1 }).map((_, i) => (
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

// ── Side-to-side mode body ────────────────────────────────────────────────
function SideToSideEditor({
  setup,
  pages,
  onPagesChange,
  pageWidthPx,
  pageHeightPx,
  registerEditor,
  onFocus,
}) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const margins = resolvedMargins(setup, 0);
  const padTop = inchToPx(margins.top);
  const padBottom = inchToPx(margins.bottom);
  const padLeft = inchToPx(margins.left);
  const padRight = inchToPx(margins.right);

  // We show one extra "phantom" spread past the last real page so the user
  // can always reach an Add Page tile, even from a one-page canvas. Without
  // this, totalSpreads=1 made Next disabled and the user could never add
  // page 2.
  const lastPageSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  const totalSpreads = lastPageSpread + 2; // +1 for last real spread, +1 for tail Add Page slot
  const leftIdx = spreadIndex * 2 - 1;     // first spread has no left page
  const rightIdx = spreadIndex * 2;        // first spread shows page 0 on the right
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

  const updatePage = useCallback((idx, html) => {
    onPagesChange(pages.map((p, i) => (i === idx ? html : p)));
  }, [pages, onPagesChange]);

  const addPage = () => onPagesChange([...pages, '']);

  const renderEditorPanel = (idx) => {
    if (idx < 0 || idx >= pages.length) {
      return (
        <button
          type="button"
          onClick={addPage}
          className="page-frame relative shrink-0 mx-auto flex items-center justify-center text-[hsl(220,8%,40%)] hover:text-[hsl(var(--chalk-yellow))] transition-colors"
          style={{
            width: pageWidthPx,
            height: pageHeightPx,
            background: 'hsl(0, 0%, 96%)',
            border: '2px dashed hsl(220, 8%, 75%)',
            borderRadius: 2,
          }}
          title="Add page"
        >
          <span className="flex flex-col items-center gap-1 font-mono text-xs">
            <Plus className="h-6 w-6" />
            Add page
          </span>
        </button>
      );
    }
    return (
      <PageFrame
        setup={setup}
        pageIndex={idx}
        live
        number={idx + 1}
        fixedHeight={pageHeightPx}
      >
        <div
          className="canvas-tiptap-wrapper page-mode"
          style={{
            paddingTop: padTop,
            paddingBottom: padBottom,
            paddingLeft: padLeft,
            paddingRight: padRight,
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <PageEditor
            initialHtml={pages[idx] || ''}
            placeholder={pages[idx] ? '' : 'Page is empty — click and start writing.'}
            ariaLabel={`Canvas page ${idx + 1}`}
            onUpdate={(html, ed) => { registerEditor(idx, ed); updatePage(idx, html); }}
            onReady={(ed) => { registerEditor(idx, ed); }}
            onFocus={onFocus}
          />
        </div>
      </PageFrame>
    );
  };

  // v0.5.1 — honour the zoom slider in side-to-side mode the same way the
  // vertical mode does. Previously the spread rendered raw pageWidthPx ×
  // pageHeightPx (1632 × 1056 for a US Letter spread) regardless of the
  // viewport, so on smaller screens or any window narrower than the spread
  // the pages stretched edge-to-edge with no padding and got clipped on the
  // right side. Now we scale the spread, allow overflow scroll for the case
  // where the user zooms in past the viewport, and keep a chalkboard gutter
  // around the spread.
  const zoom = typeof setup.zoom === 'number' ? setup.zoom : 1;

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

      {/* Scrollable scene — lets zoom > 100% pan rather than clip. */}
      <div
        className="flex-1 relative overflow-auto"
        onWheel={onWheel}
        style={{ zIndex: 2 }}
      >
        {/* Spine seam — lives inside the zoom-scaled wrapper so it tracks. */}
        <div
          className="min-h-full flex items-center justify-center px-12 py-8"
          style={{ width: 'fit-content', minWidth: '100%', margin: '0 auto' }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 120ms ease-out',
            }}
          >
            <div className="flex items-start justify-center gap-1 relative">
              {/* Spine shadow between the two pages. */}
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
              {/* Left page (verso) */}
              {isFirst ? (
                <PageFrame setup={setup} pageIndex={1} live={false} number={null} fixedHeight={pageHeightPx} />
              ) : (
                renderEditorPanel(leftIdx)
              )}
              {/* Right page (recto) */}
              {renderEditorPanel(rightIdx)}
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

export default TiptapPagedEditor;
