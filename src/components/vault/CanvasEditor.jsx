import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { exportTxt, exportMd, exportDocx, exportPdf } from './canvasExportUtils';
import { app } from '@/api/localClient';
import {
  X, Save, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code, Link, Heading2, Minus, Star, Pin, Download, Upload,
  ChevronDown, BookPlus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, Type, MoreVertical, Home, Pilcrow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addCustomWord } from '@/lib/customDict';
import DictionaryContextMenu from '@/components/DictionaryContextMenu';
import HeaderNavigator from './HeaderNavigator';
import CanvasRuler from './CanvasRuler';
import ViewMenu from './ViewMenu';
import PageSetupDialog from './PageSetupDialog';
import ParagraphDialog from './ParagraphDialog';
import PageView from './PageView';
import TiptapPagedEditor from './TiptapPagedEditor';
import { makeLegacyQuillAdapter } from '@/lib/tiptap/legacyQuillAdapter';
import { loadPageSetup, savePageSetup, saveAsDefaultPageSetup, effectiveDimensions, inchToPx } from '@/lib/pageSetup';
// v0.6.10-Alpha1 — Quillscript hub additions
import QuillscriptEditor from '@/components/quillscript/QuillscriptEditor';
import BottomReduxBar from '@/components/quillscript/BottomReduxBar';
import { isQuillginateActive, setQuillginateActive } from '@/lib/quillginate';
import { joinPagesToDoc, splitDocToBlocks } from '@/lib/tiptap/joinPagesToDoc';
import { ScrollText, Columns2, FileText } from 'lucide-react';
// v0.6.65-Alpha2 — tri-hub sync ring + Recents picker in Quillginate
import { emitCanvasChange } from '@/lib/canvasBus';
import RecentsPicker from '@/components/quillscript/RecentsPicker';

// v0.5.0 — Tiptap takes the canvas. Quill is gone. The toolbar / ruler /
// header navigator all keep their existing `quillRef.current.getEditor()`
// API thanks to the legacy adapter in @/lib/tiptap/legacyQuillAdapter.js.
// The actual editor instance(s) live inside TiptapPagedEditor; this
// component owns the chrome (header, toolbar, ruler, footer) and threads
// the active Tiptap editor through the adapter so existing code keeps
// working without rewrites.

// Toolbar helpers (font sizes, alignments, line spacing options).
const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '32px', label: '32' },
  { value: '48px', label: '48' },
];
const LINE_HEIGHTS = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3.0' },
];

// v0.4.52 — small wrapper triggers that own their own anchor ref so the
// portal Menu can position itself relative to the actual button rect.
// Defined at module scope (not inside Toolbar) so each instance has stable
// hook order regardless of toolbar re-renders.
function FontSizeTrigger({ show, setShow, Menu, items, onPick }) {
  const anchorRef = useRef(null);
  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title="Font size"
        onMouseDown={(e) => { e.preventDefault(); setShow((v) => !v); }}
        className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs font-mono"
      >
        <Type className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {show && (
        <Menu
          anchorRef={anchorRef}
          label="Font size"
          items={items}
          onPick={onPick}
          onClose={() => setShow(false)}
        />
      )}
    </div>
  );
}

function LineSpacingTrigger({ show, setShow, Menu, items, onPick }) {
  const anchorRef = useRef(null);
  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title="Line spacing"
        onMouseDown={(e) => { e.preventDefault(); setShow((v) => !v); }}
        className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs"
      >
        <MoreVertical className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {show && (
        <Menu
          anchorRef={anchorRef}
          label="Line spacing"
          items={items}
          onPick={onPick}
          onClose={() => setShow(false)}
        />
      )}
    </div>
  );
}

function Toolbar({ quillRef, pageSetup, onPageSetupChange, onOpenPageSetupDialog, onOpenParagraphDialog }) {
  const [showHeadings, setShowHeadings] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showLineHeight, setShowLineHeight] = useState(false);

  const fmt = useCallback((format, value) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    const current = q.getFormat?.();
    if (format === 'list' && current?.list === value) {
      q.format('list', false);
    } else {
      q.format(format, current?.[format] === value ? false : value);
    }
  }, [quillRef]);

  // Direct format set (no toggle) — used for size, align, line-height, indent.
  const setFmt = useCallback((format, value) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    q.format(format, value);
  }, [quillRef]);

  const adjustIndent = useCallback((delta) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    const current = parseInt(q.getFormat?.().indent || 0, 10);
    const next = Math.max(0, Math.min(8, current + delta));
    q.format('indent', next || false);
  }, [quillRef]);

  const Btn = ({ icon: Icon, title, onClick, active = false }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'h-7 w-7 rounded flex items-center justify-center transition-colors',
        active
          ? 'text-[hsl(var(--chalk-yellow))] bg-[hsl(var(--chalk-deep)/0.7)]'
          : 'text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)]'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-[hsl(var(--chalk-white-faint)/0.2)] mx-0.5" />;

  // Reusable dropdown menu component for font size + line height.
  const Menu = ({ anchorRef, items, onPick, onClose, label, align = 'left' }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useLayoutEffect(() => {
      if (!anchorRef?.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const POPOVER_W = 110;
      setPos({
        top: r.bottom + 4,
        left: align === 'right'
          ? Math.max(8, r.right - POPOVER_W)
          : r.left,
      });
    }, [anchorRef, align]);
    return createPortal(
      <>
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />
        <div
          role="menu"
          aria-label={label}
          className="fixed bg-[hsl(var(--chalk-deep)/0.97)] border border-[hsl(var(--chalk-white-faint)/0.25)] rounded-lg shadow-2xl backdrop-blur-md p-1 min-w-[88px]"
          style={{ zIndex: 9999, top: pos.top, left: pos.left }}
        >
          {items.map(it => (
            <button
              key={it.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(it.value); onClose(); }}
              className="w-full text-left px-3 py-1.5 text-xs rounded text-[hsl(220,7%,72%)] hover:bg-[hsl(var(--chalk-deep))] hover:text-[hsl(var(--chalk-yellow))] transition-colors font-mono"
            >
              {it.label}
            </button>
          ))}
        </div>
      </>,
      document.body
    );
  };

  return (
    <div className="border-b border-[hsl(var(--chalk-white-faint)/0.15)] px-4 py-1.5 flex items-center gap-0.5 flex-wrap bg-[hsl(var(--chalk-deep)/0.55)] backdrop-blur-sm">
      <Btn icon={Heading2} title="Headings" onClick={() => setShowHeadings(v => !v)} />

      {/* Font size dropdown */}
      <FontSizeTrigger
        show={showFontSize}
        setShow={setShowFontSize}
        Menu={Menu}
        items={FONT_SIZES}
        onPick={(v) => setFmt('size', v)}
      />

      <Divider />
      <Btn icon={Bold} title="Bold" onClick={() => fmt('bold', true)} />
      <Btn icon={Italic} title="Italic" onClick={() => fmt('italic', true)} />
      <Btn icon={Underline} title="Underline" onClick={() => fmt('underline', true)} />
      <Btn icon={Strikethrough} title="Strikethrough" onClick={() => fmt('strike', true)} />

      <Divider />
      {/* Alignment cluster */}
      <Btn icon={AlignLeft} title="Align left" onClick={() => setFmt('align', false)} />
      <Btn icon={AlignCenter} title="Align center" onClick={() => setFmt('align', 'center')} />
      <Btn icon={AlignRight} title="Align right" onClick={() => setFmt('align', 'right')} />
      <Btn icon={AlignJustify} title="Justify" onClick={() => setFmt('align', 'justify')} />

      <Divider />
      {/* Indent in / out (Tab + Shift-Tab also work in the editor) */}
      <Btn icon={IndentDecrease} title="Outdent (Shift-Tab)" onClick={() => adjustIndent(-1)} />
      <Btn icon={IndentIncrease} title="Indent (Tab)" onClick={() => adjustIndent(1)} />

      <Divider />
      {/* Line height dropdown */}
      <LineSpacingTrigger
        show={showLineHeight}
        setShow={setShowLineHeight}
        Menu={Menu}
        items={LINE_HEIGHTS}
        onPick={(v) => setFmt('line-height', v)}
      />

      <Divider />
      <Btn icon={List} title="Bullet list" onClick={() => fmt('list', 'bullet')} />
      <Btn icon={ListOrdered} title="Numbered list" onClick={() => fmt('list', 'ordered')} />
      <Btn icon={Quote} title="Blockquote" onClick={() => fmt('blockquote', true)} />
      <Divider />
      <Btn icon={Code} title="Code block" onClick={() => fmt('code-block', true)} />
      <Btn icon={Link} title="Link" onClick={() => { const url = prompt('Enter URL:'); if (url) fmt('link', url); }} />
      <Btn icon={Minus} title="Divider" onClick={() => {
        const q = quillRef.current?.getEditor?.();
        if (!q) return;
        const range = q.getSelection?.(true);
        if (!range) return;
        q.insertText(range.index, '────────────────────────');
      }} />
      {showHeadings && (
        <div className="flex items-center gap-1 w-full pt-1.5 flex-wrap">
          {[1, 2, 3].map(h => (
            <button key={h} type="button"
              onMouseDown={(e) => { e.preventDefault(); fmt('header', h); setShowHeadings(false); }}
              className="px-2.5 py-0.5 text-xs rounded border border-[hsl(var(--chalk-white-faint)/0.2)] text-[hsl(220,7%,65%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors font-medium"
            >H{h}</button>
          ))}
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); fmt('header', false); setShowHeadings(false); }}
            className="px-2.5 py-0.5 text-xs rounded border border-[hsl(var(--chalk-white-faint)/0.2)] text-[hsl(220,7%,65%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors font-medium"
          >Normal</button>
        </div>
      )}

      {/* v0.6.95-Alpha4 (revised) — ¶ (Paragraph dialog) + View menu live at
          the right edge of the formatting toolbar. `ml-auto` pushes them away
          from the formatting cluster so they read as a separate group, and
          since this bar is now mounted at the top of the editor, the View
          popover has full room to open downward without clipping. */}
      <div className="ml-auto flex items-center gap-0.5">
        <Divider />
        <Btn icon={Pilcrow} title="Paragraph…" onClick={() => onOpenParagraphDialog?.()} />
        <ViewMenu
          setup={pageSetup}
          onChange={onPageSetupChange}
          onOpenPageSetup={onOpenPageSetupDialog}
        />
      </div>
    </div>
  );
}

// PageRulerSlot — frames the ruler so its track width matches the current
// page width and the ticks line up with the page sheet below. Centers the
// ruler horizontally just like the page frame is centered.
function PageRulerSlot({ setup, children }) {
  const dims = effectiveDimensions(setup);
  const widthPx = Math.round(inchToPx(dims.width) * setup.zoom);
  return (
    <div
      className="shrink-0 flex justify-center"
      style={{ background: 'hsl(220, 12%, 9%)', paddingTop: 6 }}
    >
      <div style={{ width: widthPx }}>
        {children}
      </div>
    </div>
  );
}

// `embedded` mode strips the fixed-overlay/modal chrome so the editor can be
// dropped into the new Canvas Hub page (with its own tab strip). The same
// component is still used as a modal from Quillibrary's grid views.
//
// `onHome` (optional) — only set in embedded mode. When provided, a small
// home button appears before the toolbar so the user can hop back to the
// Canvas Hub landing screen from inside an open canvas (Alaria's v0.5.0
// ask: "we don't have a way to get back into the Canvas Hub").
export default function CanvasEditor({ canvas, onClose, onUpdate, embedded = false, onHome, onOpenCanvas }) {
  const [showExport, setShowExport] = useState(false);
  const importRef = useRef(null);
  const [dictToast, setDictToast] = useState('');

  const editorContainerRef = useRef(null);

  const [title, setTitle] = useState(canvas.title || 'Untitled Canvas');
  const [editingTitle, setEditingTitle] = useState(false);
  // v0.6.10-Alpha1 — Quillscript reads a single HTML blob derived from
  // the legacy `content` / `pages[]` pair via the migration shim. The
  // shim is lossless: if `pages` carries the freshest data it's joined,
  // otherwise `content` is used as-is.
  const [content, setContent] = useState(() => joinPagesToDoc(canvas));
  const [pages, setPages] = useState(() =>
    Array.isArray(canvas.pages) && canvas.pages.length ? canvas.pages : null
  );

  // Quillginate toggle (per-canvas, persisted in localStorage). When OFF
  // (default), the Quillscript single-editor renders and no paginator
  // mounts at all. When ON, the v0.5.82 paginated editor takes over —
  // visually identical to v0.5.82 so Alaria's chalkboard aesthetic is
  // preserved verbatim.
  const [quillginateOn, setQuillginateOn] = useState(() => isQuillginateActive(canvas.id));
  useEffect(() => {
    setQuillginateOn(isQuillginateActive(canvas.id));
  }, [canvas.id]);
  // v0.6.65-Alpha2 — Real Quillginate lifecycle.
  //
  // When turning ON: split the current `content` into top-level blocks so
  // the paginator gets a fresh, paginatable starting point (previously the
  // pages[] could contain a single mega-block from Quillscript edits).
  //
  // When turning OFF: snap `content` to the joined pages[] so anything
  // typed inside Quillginate flows back into Quillscript without loss.
  //
  // Also clears the autosave queue across the boundary — the new pages /
  // content shape will trigger its own save via the editor's onUpdate.
  const toggleQuillginate = useCallback(() => {
    setQuillginateOn((prev) => {
      const next = !prev;
      setQuillginateActive(canvas.id, next);
      if (next) {
        // Activating Quillginate — split single doc into blocks for the
        // paginator. The overflow controller will measure + reflow.
        try {
          const blocks = splitDocToBlocks(content);
          if (blocks && blocks.length) setPages(blocks);
        } catch { /* swallow — paginator can recover from raw content */ }
        // v0.6.95-Alpha3 — ensure Quillginate lands in a paginated layout.
        // Quillscript owns vertical+one (continuous single); Quillginate
        // needs vertical+multiple or side-to-side. If the canvas is still
        // on the default vertical+one, promote it to multiple so the
        // paginator mounts and the spread toggle has somewhere to flip
        // back to.
        setPageSetup((prev) => {
          if (prev.pageMovement === 'vertical' && prev.pageLayout === 'one') {
            return { ...prev, pageLayout: 'multiple' };
          }
          return prev;
        });
      } else {
        // Deactivating Quillginate — collapse pages back into a single
        // continuous HTML doc for the Quillscript single editor.
        try {
          const joined = joinPagesToDoc({ content, pages });
          if (joined) setContent(joined);
        } catch { /* swallow */ }
      }
      return next;
    });
  }, [canvas.id, content, pages]);
  const [savedLabel, setSavedLabel] = useState('');
  const [isPinned, setIsPinned] = useState(canvas.is_pinned || false);
  const [isFavorite, setIsFavorite] = useState(canvas.is_favorite || false);

  // Active Tiptap editor (whichever is focused). The legacy quillRef adapter
  // resolves through this — every existing piece of code that hits
  // quillRef.current.getEditor() ends up talking to the focused Tiptap.
  const [activeEditor, setActiveEditor] = useState(null);
  const tiptapRef = useRef(null);

  // Mirror activeEditor in a ref so the adapter's getter (called lazily)
  // always sees the latest editor instance.
  const activeEditorRef = useRef(null);
  useEffect(() => { activeEditorRef.current = activeEditor; }, [activeEditor]);

  // Stable adapter — never re-created. The closure captures activeEditor
  // through the ref so toolbar/ruler/navigator always reach the focused one.
  const adapterRef = useRef(null);
  if (!adapterRef.current) {
    adapterRef.current = makeLegacyQuillAdapter(() => activeEditorRef.current);
  }

  // The quillRef shape consumers expect: { current: { getEditor() } }
  const quillRef = useMemo(() => ({
    current: {
      getEditor: () => adapterRef.current.getEditor(),
    },
  }), []);

  const autoSaveTimer = useRef(null);

  // ── Page Setup state ───────────────────────────────────────────────────
  const [pageSetup, setPageSetup] = useState(() => loadPageSetup(canvas.id));
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
  // ── v0.5.8 Paragraph dialog state ──────────────────────────────────────
  const [showParagraphDialog, setShowParagraphDialog] = useState(false);

  useEffect(() => {
    setPageSetup(loadPageSetup(canvas.id));
  }, [canvas.id]);

  useEffect(() => {
    savePageSetup(canvas.id, pageSetup);
  }, [pageSetup, canvas.id]);

  const updatePageSetup = useCallback((partial) => {
    setPageSetup((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyPageSetup = useCallback((next) => {
    setPageSetup(next);
  }, []);

  const setAsDefaultPageSetup = useCallback((next) => {
    saveAsDefaultPageSetup(next);
  }, []);

  // ── Dictionary lookup (uses adapter — Tiptap-backed) ─────────────────────
  const handleAddToDictionary = () => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const range = q.getSelection?.();
    if (!range || range.length === 0) { setDictToast('Select a word first'); setTimeout(() => setDictToast(''), 2000); return; }
    const word = q.getText(range.index, range.length).trim();
    if (!word) return;
    addCustomWord({ word });
    setDictToast(`"${word}" added!`);
    setTimeout(() => setDictToast(''), 2000);
  };

  // ── Save (auto + manual) ─────────────────────────────────────────────────
  // v0.5.0 — saves both `content` (vertical / source-of-truth) and `pages`
  // (side-to-side editor segments). Either may be undefined depending on
  // mode; we always send what we have.
  const save = async (overrideContent, overridePages) => {
    const toSaveContent = overrideContent !== undefined ? overrideContent : content;
    const toSavePages = overridePages !== undefined ? overridePages : pages;
    const payload = {
      content: toSaveContent,
      title,
    };
    if (Array.isArray(toSavePages)) payload.pages = toSavePages;
    const updated = await app.entities.Canvas.update(canvas.id, payload);
    setSavedLabel('Saved');
    setTimeout(() => setSavedLabel(''), 1500);
    onUpdate?.(updated);
    // v0.6.65-Alpha2 — broadcast on the canvas bus so Quillounge +
    // Quillibrary refresh their lists live.
    emitCanvasChange('updated', { id: canvas.id, canvas: updated });
  };

  const scheduleAutoSave = useCallback((nextContent, nextPages) => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(nextContent, nextPages), 1200);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  // v0.6.10-Alpha1 — Quillscript inline title edits aren't gated by a
  // blur handler (the input is just a controlled text field inside the
  // editor body). Debounce-save whenever the title changes so the new
  // title persists without a manual save click. Skipped on the very
  // first render to avoid a no-op save on canvas open.
  const titleSaveTimer = useRef(null);
  const titleHydratedRef = useRef(false);
  useEffect(() => {
    if (!titleHydratedRef.current) { titleHydratedRef.current = true; return; }
    clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      const trimmed = (title || '').trim() || 'Untitled Canvas';
      app.entities.Canvas.update(canvas.id, { title: trimmed }).then((updated) => {
        onUpdate?.(updated);
        emitCanvasChange('updated', { id: canvas.id, patch: { title: trimmed }, canvas: updated });
      }).catch(() => { /* swallow — next autosave retries */ });
    }, 900);
    return () => clearTimeout(titleSaveTimer.current);
  }, [title, canvas.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // v0.5.71 — bidirectional sync. Whenever EITHER `content` or `pages`
  // changes, the OTHER must be updated to match so that mode-switching
  // (continuous-single ↔ paginated) shows the same canonical document
  // with formatting preserved. The two stores are always equivalent:
  //   • content === pages.join('') for paginated docs
  //   • content === pages[0] for single-page (or freshly continuous) docs
  const handleContentChange = useCallback((html) => {
    setContent(html);
    // Mirror to pages so a future spread mount reads the same HTML. Single
    // page is fine — the overflow controller will repaginate on first paint
    // if the doc is too tall for one page.
    const mirroredPages = [html];
    setPages(mirroredPages);
    scheduleAutoSave(html, mirroredPages);
  }, [scheduleAutoSave]);

  const handlePagesChange = useCallback((nextPages) => {
    setPages(nextPages);
    // Pages are already complete HTML blobs; concatenate without a
    // separator (a raw '\n' between two block-level HTML strings is
    // semantically harmless but creates phantom whitespace text-nodes
    // when re-parsed by a continuous editor — which was the v0.5.7
    // formatting drift between modes).
    const joined = (nextPages || []).join('');
    setContent(joined);
    scheduleAutoSave(joined, nextPages);
  }, [scheduleAutoSave]);

  // ── Import (TXT/MD) — wraps lines as <p>; both modes accept HTML ─────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const html = text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<p></p>').join('');
      setContent(html);
      // Imports replace single-page content; if user is in side-to-side they
      // can split manually from there. Reset pages to one page of imported HTML.
      setPages([html]);
      scheduleAutoSave(html, [html]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = async (fmt) => {
    setShowExport(false);
    const t = title || 'Untitled Canvas';
    const exportContent = pages ? pages.join('\n') : content;
    if (fmt === 'txt') exportTxt(t, exportContent);
    else if (fmt === 'md') exportMd(t, exportContent);
    else if (fmt === 'docx') await exportDocx(t, exportContent);
    else if (fmt === 'pdf') exportPdf(t, exportContent);
  };

  const saveTitle = async (newTitle) => {
    const trimmed = newTitle.trim() || 'Untitled Canvas';
    setTitle(trimmed);
    setEditingTitle(false);
    const updated = await app.entities.Canvas.update(canvas.id, { title: trimmed });
    onUpdate?.({ ...canvas, title: trimmed });
    emitCanvasChange('updated', { id: canvas.id, patch: { title: trimmed }, canvas: updated });
  };

  const togglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    const updated = await app.entities.Canvas.update(canvas.id, { is_pinned: next });
    onUpdate?.({ ...canvas, is_pinned: next });
    emitCanvasChange('updated', { id: canvas.id, patch: { is_pinned: next }, canvas: updated });
  };

  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    const updated = await app.entities.Canvas.update(canvas.id, { is_favorite: next });
    onUpdate?.({ ...canvas, is_favorite: next });
    emitCanvasChange('updated', { id: canvas.id, patch: { is_favorite: next }, canvas: updated });
  };

  // v0.6.65-Alpha2 — emoji + cover state (Notion-style page icon + cover).
  // Both are per-canvas, persisted via Canvas.update with new fields.
  // The migration is forward-only: legacy canvases without these fields
  // simply default to 📄 + no cover.
  const [emoji, setEmojiState] = useState(canvas.emoji || '📄');
  const [coverId, setCoverIdState] = useState(canvas.cover_id || null);
  useEffect(() => {
    setEmojiState(canvas.emoji || '📄');
    setCoverIdState(canvas.cover_id || null);
  }, [canvas.id, canvas.emoji, canvas.cover_id]);

  const handleEmojiChange = useCallback(async (next) => {
    const value = next || '📄';
    setEmojiState(value);
    const updated = await app.entities.Canvas.update(canvas.id, { emoji: value });
    onUpdate?.({ ...canvas, emoji: value });
    emitCanvasChange('updated', { id: canvas.id, patch: { emoji: value }, canvas: updated });
  }, [canvas, onUpdate]);

  const handleCoverChange = useCallback(async (nextId) => {
    setCoverIdState(nextId);
    const updated = await app.entities.Canvas.update(canvas.id, { cover_id: nextId });
    onUpdate?.({ ...canvas, cover_id: nextId });
    emitCanvasChange('updated', { id: canvas.id, patch: { cover_id: nextId }, canvas: updated });
  }, [canvas, onUpdate]);

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // v0.6.10-Alpha1 — Broadcast "Space › Title" breadcrumb to the top
  // rail so the user always knows where they are. Fires whenever the
  // title or space changes, and clears on unmount so navigating off the
  // canvas hub doesn't leave a stale crumb.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('quillscript:breadcrumb', {
      detail: {
        title: title || 'Untitled',
        space: canvas.space_name || 'Unsorted',
        canvasId: canvas.id,
      },
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('quillscript:breadcrumb', { detail: null }));
    };
  }, [title, canvas.space_name, canvas.id]);

  // Inner shell — header, toolbar, editor, footer. Modal mode wraps this in a
  // fixed overlay; embedded mode renders it as a flex child of the hub.
  const shell = (
      <div
        ref={editorContainerRef}
        className={cn(
          'flex flex-col overflow-hidden bg-[hsl(220,8%,13%)]',
          embedded
            ? 'flex-1 w-full h-full'
            : 'relative z-10 w-full max-w-4xl h-[90vh] rounded-2xl border border-[hsl(225,9%,22%)] shadow-2xl'
        )}
      >
        <DictionaryContextMenu containerRef={editorContainerRef} />

        {/* Header — close button is hidden in embedded mode (tabs handle close).
            v0.6.10-Alpha1: in Quillscript mode the title input is rendered
            inline at the top of the editor body (Notion-style header), so
            the header only shows the breadcrumb-style label + the canvas
            chrome buttons. In Quillginate mode the legacy title chip is
            kept for parity with v0.5.82. */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(225,9%,18%)] bg-[hsl(220,8%,15%)] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {quillginateOn ? (
              <>
                <span className="text-lg">📄</span>
                {editingTitle ? (
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => saveTitle(title)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle(title);
                      if (e.key === 'Escape') { setTitle(canvas.title || 'Untitled Canvas'); setEditingTitle(false); }
                    }}
                    className="text-base font-semibold bg-[hsl(228,8%,22%)] border border-primary/50 rounded px-2 py-0.5 text-white focus:outline-none w-64"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="text-base font-semibold text-white hover:text-primary transition-colors truncate"
                    title="Click to rename"
                  >
                    {title}
                  </button>
                )}
              </>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-wider text-[hsl(220,7%,55%)] truncate">
                Quillscript · {canvas.space_name || 'Unsorted'} · {title || 'Untitled'}
              </span>
            )}
            {quillginateOn && canvas.space_name && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium shrink-0">
                {canvas.space_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {savedLabel && <span className="text-[10px] text-green-400">{savedLabel}</span>}
            <button
              onClick={toggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", isFavorite ? "text-yellow-400 hover:text-yellow-300" : "text-[hsl(220,7%,45%)] hover:text-yellow-400")}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={togglePin}
              title={isPinned ? 'Unpin' : 'Pin'}
              className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", isPinned ? "text-primary" : "text-[hsl(220,7%,45%)] hover:text-primary")}
            >
              <Pin className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} />
            </button>
            {/* Import */}
            <input ref={importRef} type="file" accept=".txt,.md" className="hidden" onChange={handleImport} />
            <button onClick={() => importRef.current?.click()} title="Import TXT or MD" className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors">
              <Upload className="h-4 w-4" />
            </button>
            {/* Export */}
            <div className="relative">
              <button onClick={() => setShowExport(v => !v)} title="Export" className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,45%)] hover:text-white transition-colors">
                <Download className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-9 z-50 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-xl shadow-2xl p-1 min-w-32">
                    {['txt','md','docx','pdf'].map(fmt => (
                      <button key={fmt} onClick={() => handleExport(fmt)}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg text-[hsl(220,7%,65%)] hover:bg-[hsl(228,7%,25%)] hover:text-white transition-colors uppercase font-mono tracking-wider">
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {dictToast && <span className="text-[10px] text-green-400 whitespace-nowrap">{dictToast}</span>}
            {/* v0.6.95-Alpha4 (revised by Alaria) — ¶ + View moved back into the
                formatting Toolbar's right edge (with ml-auto). The top toolbar
                here keeps only Custom Dictionary + Save; ¶/View are colocated
                with the rest of the formatting controls where they belong. */}
            <button onClick={handleAddToDictionary} title="Add selected text to Custom Dictionary" className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,45%)] hover:text-white transition-colors">
              <BookPlus className="h-4 w-4" />
            </button>
            <button onClick={() => save()} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors" title="Save now">
              <Save className="h-4 w-4" />
            </button>
            {/* v0.6.10-Alpha1 — Quillginate toggle.
                Per-canvas, persisted. When ON, the paginated layout
                editor mounts; when OFF, Quillscript single-editor
                renders. Tooltip + active styling makes the current
                state obvious without a separate label. */}
            {quillginateOn && (
              <RecentsPicker
                currentCanvasId={canvas.id}
                onPick={(id) => { if (id !== canvas.id) onOpenCanvas?.(id); }}
              />
            )}
            {/* v0.6.95-Alpha3 — Spread mode toggle.
                Only renders when Quillginate is ON. Flips pageMovement
                between 'vertical' (single-page paginated) and 'side-to-side'
                (book spread). When switching back to vertical from spread
                we force pageLayout to 'multiple' so we land in the paginated
                tower, not the continuous-single mode that belongs to
                Quillscript. */}
            {quillginateOn && (
              <button
                onClick={() => {
                  const goingSpread = pageSetup.pageMovement !== 'side-to-side';
                  updatePageSetup(
                    goingSpread
                      ? { pageMovement: 'side-to-side' }
                      : { pageMovement: 'vertical', pageLayout: 'multiple' }
                  );
                }}
                title={
                  pageSetup.pageMovement === 'side-to-side'
                    ? 'Spread mode — click to switch to single page'
                    : 'Single page — click to switch to spread mode'
                }
                className={cn(
                  'h-7 px-2 rounded flex items-center gap-1 text-xs font-mono uppercase tracking-wider transition-colors',
                  pageSetup.pageMovement === 'side-to-side'
                    ? 'text-[hsl(var(--chalk-yellow))] bg-[hsl(var(--chalk-deep)/0.7)]'
                    : 'text-[hsl(220,7%,45%)] hover:text-white'
                )}
              >
                {pageSetup.pageMovement === 'side-to-side'
                  ? <Columns2 className="h-4 w-4" />
                  : <FileText className="h-4 w-4" />}
                <span>{pageSetup.pageMovement === 'side-to-side' ? 'Spread' : 'Single'}</span>
              </button>
            )}
            <button
              onClick={toggleQuillginate}
              title={quillginateOn ? 'Quillginate ON — click to switch to Quillscript' : 'Quillginate OFF — click to activate page layout'}
              className={cn(
                'h-7 px-2 rounded flex items-center gap-1 text-xs font-mono uppercase tracking-wider transition-colors',
                quillginateOn
                  ? 'text-[hsl(var(--chalk-yellow))] bg-[hsl(var(--chalk-deep)/0.7)]'
                  : 'text-[hsl(220,7%,45%)] hover:text-white'
              )}
            >
              <ScrollText className="h-4 w-4" />
              <span>{quillginateOn ? 'Quillginate' : 'Off'}</span>
            </button>
            {!embedded && (
              <button onClick={onClose} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Editor surface — mode swap:
              • Quillginate ON  → v0.5.82 paginated layout (TiptapPagedEditor +
                                  ruler + outline rail + top toolbar)
              • Quillginate OFF → Quillscript single-editor (bottom redux
                                  bar, Notion-style page header)
            By spec (Alaria): "Quillginate (off mode) will NOT run as
            background task" — in OFF mode TiptapPagedEditor is fully
            unmounted and no paginator process exists. */}
        {quillginateOn ? (
          <>
            {/* Quillginate top toolbar (preserved verbatim from v0.5.82) */}
            <Toolbar
              quillRef={quillRef}
              pageSetup={pageSetup}
              onPageSetupChange={updatePageSetup}
              onOpenPageSetupDialog={() => setShowPageSetupDialog(true)}
              onOpenParagraphDialog={() => setShowParagraphDialog(true)}
            />
            <div className="flex flex-1 overflow-hidden relative">
              <HeaderNavigator quillRef={quillRef} content={content} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <PageRulerSlot setup={pageSetup}>
                  <CanvasRuler quillRef={quillRef} canvasId={canvas.id} editorTick={activeEditor} />
                </PageRulerSlot>
                <PageView setup={pageSetup}>
                  <TiptapPagedEditor
                    ref={tiptapRef}
                    setup={pageSetup}
                    canvas={canvas}
                    initialContent={content}
                    initialPages={pages}
                    onContentChange={handleContentChange}
                    onPagesChange={handlePagesChange}
                    onActiveEditorChange={(ed) => setActiveEditor(ed)}
                  />
                </PageView>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* v0.6.95-Alpha5 — Quillscript's formatting bar (still imported
                under its legacy `BottomReduxBar` name) is now mounted ABOVE
                the editor instead of below it, matching Quillginate mode
                exactly. The component is unchanged behaviorally; only its
                slot position swapped. ¶ + View live on its right edge now,
                same as Quillginate's Toolbar, since the popover has full
                downward room from the top of the editor. File rename for
                BottomReduxBar → FormatReduxBar deferred — internal name only. */}
            <BottomReduxBar
              quillRef={quillRef}
              pageSetup={pageSetup}
              onPageSetupChange={updatePageSetup}
              onOpenPageSetupDialog={() => setShowPageSetupDialog(true)}
              onOpenParagraphDialog={() => setShowParagraphDialog(true)}
            />
            <div className="flex flex-1 overflow-hidden relative">
              <QuillscriptEditor
                key={canvas.id}
                canvas={canvas}
                initialHtml={content}
                title={title}
                emoji={emoji}
                coverId={coverId}
                onTitleChange={(t) => setTitle(t)}
                onEmojiChange={handleEmojiChange}
                onCoverChange={handleCoverChange}
                onContentChange={(html) => {
                  setContent(html);
                  scheduleAutoSave(html, undefined);
                }}
                onActiveEditorChange={(ed) => setActiveEditor(ed)}
              />
            </div>
          </>
        )}

        {/* Page Setup dialog */}
        <PageSetupDialog
          open={showPageSetupDialog}
          setup={pageSetup}
          onApply={applyPageSetup}
          onSetDefault={setAsDefaultPageSetup}
          onClose={() => setShowPageSetupDialog(false)}
        />

        {/* v0.5.8 — Word-style Paragraph dialog
            v0.5.81 — also receives a getAllEditors getter so it can fan the
            paragraph format out across every page editor in paginated
            modes when the user has done a cross-page Select-All. */}
        <ParagraphDialog
          open={showParagraphDialog}
          editor={activeEditor}
          getAllEditors={() => tiptapRef.current?.getAllEditors?.() || []}
          onClose={() => setShowParagraphDialog(false)}
        />

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[hsl(225,9%,18%)] bg-[hsl(220,8%,15%)] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-[hsl(220,7%,40%)]">
            Auto-saves as you type · Last edited {canvas.updated_date ? new Date(canvas.updated_date).toLocaleDateString() : 'just now'}
          </span>
          {canvas.conversation_id && (
            <span className="text-[10px] text-[hsl(220,7%,40%)]">🔗 Linked to chat</span>
          )}
        </div>
      </div>
  );

  if (embedded) return shell;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      {shell}
    </div>
  );
}
