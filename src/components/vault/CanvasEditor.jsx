import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { exportTxt, exportMd, exportDocx, exportPdf } from './canvasExportUtils';
import ReactQuill from 'react-quill';
import '@/lib/quillFormats'; // side-effect: registers font-size whitelist + line-height
import { app } from '@/api/localClient';
import {
  X, Save, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code, Link, Heading2, Minus, Star, Pin, Download, Upload,
  ChevronDown, BookPlus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, Type, MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addCustomWord } from '@/lib/customDict';
import DictionaryContextMenu from '@/components/DictionaryContextMenu';
import HeaderNavigator from './HeaderNavigator';
import CanvasRuler from './CanvasRuler';
import ViewMenu from './ViewMenu';
import PageSetupDialog from './PageSetupDialog';
import PageView from './PageView';
import { loadPageSetup, savePageSetup, saveAsDefaultPageSetup, effectiveDimensions, inchToPx } from '@/lib/pageSetup';

// Tab/Shift-Tab indent bindings are registered IMPERATIVELY in a useEffect
// below — not via modules.keyboard.bindings here. Quill's keyboard module
// initializes built-in Tab handlers (lists/code-blocks) BEFORE module-config
// bindings, so static bindings get pre-empted. Calling quill.keyboard.
// addBinding() at runtime PREPENDS to the binding chain, guaranteeing our
// Tab handler fires first.
const modules = {
  toolbar: false,
};

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

const editorStyles = `
  .vault-quill-wrapper { width: 100%; display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  .vault-quill-wrapper .ql-container { background: transparent; border: none; font-size: 14px; color: hsl(220, 14%, 90%); flex: 1; overflow-y: auto; outline: none !important; box-shadow: none !important; }
  .vault-quill-wrapper .ql-container:focus, .vault-quill-wrapper .ql-container:focus-visible, .vault-quill-wrapper .ql-container *:focus, .vault-quill-wrapper .ql-container *:focus-visible { outline: none !important; box-shadow: none !important; }
  .vault-quill-wrapper .ql-editor { padding: 24px 32px; word-break: break-word; overflow-wrap: break-word; min-height: 200px; outline: none !important; tab-size: 4; -moz-tab-size: 4; white-space: pre-wrap; }
  .vault-quill-wrapper .ql-editor:focus, .vault-quill-wrapper .ql-editor:focus-visible { outline: none !important; box-shadow: none !important; border-color: transparent !important; }
  .vault-quill-wrapper .ql-editor.ql-blank::before { content: none; }

  /* Page-mode: when wrapped inside a PageFrame, the editor lives ON the
     paper sheet. Drop the dark background and our own padding (the page
     frame supplies margins via padding) and switch text colour to dark so it
     reads against the white sheet. */
  .vault-quill-wrapper.page-mode { overflow: visible; }
  .vault-quill-wrapper.page-mode .ql-container { color: hsl(220, 30%, 12%); overflow: visible; }
  .vault-quill-wrapper.page-mode .ql-editor { padding: 0; min-height: 100%; color: hsl(220, 30%, 12%); }
  .vault-quill-wrapper.page-mode .ql-editor.ql-blank::before { color: hsl(220, 8%, 55%); }
  .vault-quill-wrapper.page-mode .ql-editor blockquote { color: hsl(220, 12%, 30%); }
  .vault-quill-wrapper.page-mode .ql-editor a { color: hsl(235, 80%, 45%); }
  .vault-quill-wrapper.page-mode .ql-editor hr { border-top-color: hsl(220, 8%, 70%); }
  .vault-quill-wrapper.page-mode .ql-editor pre.ql-syntax { background: hsl(220, 8%, 92%); color: hsl(220, 30%, 12%); }
  .vault-quill-wrapper.page-mode .ql-editor code { background: hsl(220, 8%, 92%); color: hsl(220, 30%, 12%); }
  .vault-quill-wrapper .ql-editor h1 { font-size: 2em; font-weight: 700; margin: 12px 0 6px; }
  .vault-quill-wrapper .ql-editor h2 { font-size: 1.5em; font-weight: 700; margin: 10px 0 5px; }
  .vault-quill-wrapper .ql-editor h3 { font-size: 1.2em; font-weight: 700; margin: 8px 0 4px; }
  .vault-quill-wrapper .ql-editor p { margin: 4px 0; line-height: 1.7; }
  .vault-quill-wrapper .ql-editor blockquote { border-left: 4px solid hsl(235,86%,65%); padding-left: 14px; margin: 8px 0; color: hsl(220,7%,60%); font-style: italic; }
  .vault-quill-wrapper .ql-editor pre.ql-syntax { background: hsl(220,8%,14%); border-radius: 6px; padding: 14px; font-family: monospace; font-size: 12px; overflow-x: auto; }
  .vault-quill-wrapper .ql-editor a { color: hsl(235,86%,75%); text-decoration: underline; }
  .vault-quill-wrapper .ql-editor ul, .vault-quill-wrapper .ql-editor ol { padding-left: 1.8em; margin: 6px 0; }
  .vault-quill-wrapper .ql-editor li { margin: 3px 0; line-height: 1.6; }
  .vault-quill-wrapper .ql-editor hr { border: none; border-top: 1px solid hsl(225,9%,22%); margin: 16px 0; }
  .vault-quill-wrapper .ql-editor strong { font-weight: 700; }
  .vault-quill-wrapper .ql-editor em { font-style: italic; }
  .vault-quill-wrapper .ql-editor u { text-decoration: underline; }
  .vault-quill-wrapper .ql-editor s { text-decoration: line-through; }
  .vault-quill-wrapper .ql-editor code { background: hsl(220,8%,14%); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 12px; }
  /* Alignment classes Quill emits when you set 'align' format */
  .vault-quill-wrapper .ql-editor .ql-align-center { text-align: center; }
  .vault-quill-wrapper .ql-editor .ql-align-right { text-align: right; }
  .vault-quill-wrapper .ql-editor .ql-align-justify { text-align: justify; }
  /* Indent classes (Quill stamps ql-indent-1 .. ql-indent-8) */
  .vault-quill-wrapper .ql-editor .ql-indent-1 { padding-left: 3em; }
  .vault-quill-wrapper .ql-editor .ql-indent-2 { padding-left: 6em; }
  .vault-quill-wrapper .ql-editor .ql-indent-3 { padding-left: 9em; }
  .vault-quill-wrapper .ql-editor .ql-indent-4 { padding-left: 12em; }
  .vault-quill-wrapper .ql-editor .ql-indent-5 { padding-left: 15em; }
  .vault-quill-wrapper .ql-editor .ql-indent-6 { padding-left: 18em; }
  .vault-quill-wrapper .ql-editor .ql-indent-7 { padding-left: 21em; }
  .vault-quill-wrapper .ql-editor .ql-indent-8 { padding-left: 24em; }
`;

function Toolbar({ quillRef, pageSetup, onPageSetupChange, onOpenPageSetupDialog }) {
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
  const Menu = ({ items, onPick, onClose, label }) => (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 mt-1 bg-[hsl(var(--chalk-deep)/0.97)] border border-[hsl(var(--chalk-white-faint)/0.25)] rounded-lg shadow-2xl backdrop-blur-md p-1 min-w-[88px]"
        role="menu"
        aria-label={label}
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
    </>
  );

  return (
    <div className="border-b border-[hsl(var(--chalk-white-faint)/0.15)] px-4 py-1.5 flex items-center gap-0.5 flex-wrap bg-[hsl(var(--chalk-deep)/0.55)] backdrop-blur-sm">
      <Btn icon={Heading2} title="Headings" onClick={() => setShowHeadings(v => !v)} />

      {/* Font size dropdown */}
      <div className="relative">
        <button
          type="button"
          title="Font size"
          onMouseDown={(e) => { e.preventDefault(); setShowFontSize(v => !v); }}
          className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs font-mono"
        >
          <Type className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </button>
        {showFontSize && (
          <Menu
            label="Font size"
            items={FONT_SIZES}
            onPick={(v) => setFmt('size', v)}
            onClose={() => setShowFontSize(false)}
          />
        )}
      </div>

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
      <div className="relative">
        <button
          type="button"
          title="Line spacing"
          onMouseDown={(e) => { e.preventDefault(); setShowLineHeight(v => !v); }}
          className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs"
        >
          <MoreVertical className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </button>
        {showLineHeight && (
          <Menu
            label="Line spacing"
            items={LINE_HEIGHTS}
            onPick={(v) => setFmt('line-height', v)}
            onClose={() => setShowLineHeight(false)}
          />
        )}
      </div>

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

      {/* View menu — pushed to the far right */}
      <div className="ml-auto">
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
export default function CanvasEditor({ canvas, onClose, onUpdate, embedded = false }) {
  const [showExport, setShowExport] = useState(false);
  const importRef = useRef(null);
  const [dictToast, setDictToast] = useState('');

  const editorContainerRef = useRef(null);

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

  const handleExport = async (fmt) => {
    setShowExport(false);
    const t = title || 'Untitled Canvas';
    if (fmt === 'txt') exportTxt(t, content);
    else if (fmt === 'md') exportMd(t, content);
    else if (fmt === 'docx') await exportDocx(t, content);
    else if (fmt === 'pdf') exportPdf(t, content);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // wrap plain text in <p> tags per line
      const html = text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<p><br></p>').join('');
      setContent(html);
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => save(html), 1200);
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const [title, setTitle] = useState(canvas.title || 'Untitled Canvas');
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState(canvas.content || '');
  const [savedLabel, setSavedLabel] = useState('');
  const [isPinned, setIsPinned] = useState(canvas.is_pinned || false);
  const [isFavorite, setIsFavorite] = useState(canvas.is_favorite || false);
  const quillRef = useRef(null);
  const autoSaveTimer = useRef(null);

  // ── Page Setup state ───────────────────────────────────────────────────
  // Loaded from localStorage on mount (per-canvas, falling back to global
  // default). Changes auto-persist per canvas. "Set As Default" in the
  // dialog also saves to the global default key.
  const [pageSetup, setPageSetup] = useState(() => loadPageSetup(canvas.id));
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);

  useEffect(() => {
    // Reload page setup if a different canvas mounts.
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

  // Tab / Shift-Tab on Canvas — v0.4.34 behavior:
  //   • Inserts a literal tab character (\t) at the cursor, jumping to the
  //     next tab stop just like Microsoft Word. The browser handles spacing
  //     via CSS `tab-size: 4` on .ql-editor.
  //   • Shift-Tab deletes the tab character immediately preceding the cursor
  //     if there is one (otherwise no-op). Mirrors Word's Shift-Tab.
  //   • Indent markers on the ruler are NEVER touched by Tab. Indents are
  //     drag-only now. The hourglass stays locked unless you grab it.
  //   • Lists and code-blocks keep their native Tab behavior (Quill nests
  //     bullets / inserts a literal tab in code).
  // Captured in the DOM capture phase so Quill's built-in keyboard module
  // never sees it.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let cleanupFn = null;
    const install = () => {
      if (cancelled) return;
      const q = quillRef.current?.getEditor?.();
      if (!q?.root) {
        if (tries++ < 30) setTimeout(install, 50);
        return;
      }
      const root = q.root;
      const handler = (e) => {
        if (e.key !== 'Tab') return;
        const sel = q.getSelection();
        if (!sel) return;
        const f = q.getFormat(sel);
        if (f.list || f['code-block']) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          // Delete preceding tab character, if any.
          if (sel.index > 0) {
            const prev = q.getText(sel.index - 1, 1);
            if (prev === '\t') {
              q.deleteText(sel.index - 1, 1, 'user');
            }
          }
        } else {
          // Insert literal tab. Replace any current selection first.
          if (sel.length > 0) q.deleteText(sel.index, sel.length, 'user');
          q.insertText(sel.index, '\t', 'user');
          q.setSelection(sel.index + 1, 0, 'user');
        }
      };
      root.addEventListener('keydown', handler, true);
      cleanupFn = () => root.removeEventListener('keydown', handler, true);
    };
    install();
    return () => { cancelled = true; cleanupFn?.(); };
  }, []);

  const save = async (val, extraFields = {}) => {
    const toSave = val !== undefined ? val : content;
    const updated = await app.entities.Canvas.update(canvas.id, {
      content: toSave,
      title,
      ...extraFields,
    });
    setSavedLabel('Saved');
    setTimeout(() => setSavedLabel(''), 1500);
    onUpdate?.(updated);
  };

  const handleChange = (val) => {
    setContent(val);
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(val), 1200);
  };

  const saveTitle = async (newTitle) => {
    const trimmed = newTitle.trim() || 'Untitled Canvas';
    setTitle(trimmed);
    setEditingTitle(false);
    await app.entities.Canvas.update(canvas.id, { title: trimmed });
    onUpdate?.({ ...canvas, title: trimmed });
  };

  const togglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    await app.entities.Canvas.update(canvas.id, { is_pinned: next });
    onUpdate?.({ ...canvas, is_pinned: next });
  };

  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    await app.entities.Canvas.update(canvas.id, { is_favorite: next });
    onUpdate?.({ ...canvas, is_favorite: next });
  };

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimer.current);
    };
  }, []);

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
        <style>{editorStyles}</style>
        <DictionaryContextMenu containerRef={editorContainerRef} />

        {/* Header — close button is hidden in embedded mode (tabs handle close) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(225,9%,18%)] bg-[hsl(220,8%,15%)] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
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
            {canvas.space_name && (
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
            <button onClick={handleAddToDictionary} title="Add selected text to Custom Dictionary" className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,45%)] hover:text-white transition-colors">
              <BookPlus className="h-4 w-4" />
            </button>
            <button onClick={() => save()} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors" title="Save now">
              <Save className="h-4 w-4" />
            </button>
            {!embedded && (
              <button onClick={onClose} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <Toolbar
          quillRef={quillRef}
          pageSetup={pageSetup}
          onPageSetupChange={updatePageSetup}
          onOpenPageSetupDialog={() => setShowPageSetupDialog(true)}
        />

        {/* Editor + outline rail (rail on the LEFT, ruler bar above editor — v0.4.30) */}
        <div className="flex flex-1 overflow-hidden relative">
          <HeaderNavigator quillRef={quillRef} content={content} />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ruler is constrained to the page width so its ticks/markers
                line up with the actual page content, not the full window. */}
            <PageRulerSlot setup={pageSetup}>
              <CanvasRuler quillRef={quillRef} canvasId={canvas.id} />
            </PageRulerSlot>
            <PageView setup={pageSetup}>
              <div className="vault-quill-wrapper page-mode">
                <ReactQuill
                  ref={quillRef}
                  value={content}
                  onChange={handleChange}
                  modules={modules}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                />
              </div>
            </PageView>
          </div>
        </div>

        {/* Page Setup dialog */}
        <PageSetupDialog
          open={showPageSetupDialog}
          setup={pageSetup}
          onApply={applyPageSetup}
          onSetDefault={setAsDefaultPageSetup}
          onClose={() => setShowPageSetupDialog(false)}
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