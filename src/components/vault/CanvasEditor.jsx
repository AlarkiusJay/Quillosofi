import { useState, useRef, useCallback, useEffect } from 'react';
import { exportTxt, exportMd, exportDocx, exportPdf } from './canvasExportUtils';
import ReactQuill from 'react-quill';
import { base44 } from '@/api/base44Client';
import { X, Save, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Link, Heading2, Minus, Star, Pin, Download, Upload, ChevronDown, BookPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addCustomWord } from '@/lib/customDict';
import DictionaryContextMenu from '@/components/DictionaryContextMenu';

const modules = { toolbar: false };

const editorStyles = `
  .vault-quill-wrapper { width: 100%; display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  .vault-quill-wrapper .ql-container { background: transparent; border: none; font-size: 14px; color: hsl(220, 14%, 90%); flex: 1; overflow-y: auto; }
  .vault-quill-wrapper .ql-editor { padding: 24px 32px; word-break: break-word; overflow-wrap: break-word; min-height: 200px; }
  .vault-quill-wrapper .ql-editor.ql-blank::before { color: hsl(220,7%,40%); font-style: normal; content: 'Start writing...'; }
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
`;

function Toolbar({ quillRef }) {
  const [showHeadings, setShowHeadings] = useState(false);

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

  const Btn = ({ icon: Icon, title, onClick }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-[hsl(225,9%,22%)] mx-0.5" />;

  return (
    <div className="border-b border-[hsl(225,9%,15%)] px-4 py-1.5 flex items-center gap-0.5 flex-wrap bg-[hsl(220,8%,14%)]">
      <Btn icon={Heading2} title="Headings" onClick={() => setShowHeadings(v => !v)} />
      <Divider />
      <Btn icon={Bold} title="Bold" onClick={() => fmt('bold', true)} />
      <Btn icon={Italic} title="Italic" onClick={() => fmt('italic', true)} />
      <Btn icon={Underline} title="Underline" onClick={() => fmt('underline', true)} />
      <Btn icon={Strikethrough} title="Strikethrough" onClick={() => fmt('strike', true)} />
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
              className="px-2.5 py-0.5 text-xs rounded border border-[hsl(225,9%,20%)] text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors font-medium"
            >H{h}</button>
          ))}
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); fmt('header', false); setShowHeadings(false); }}
            className="px-2.5 py-0.5 text-xs rounded border border-[hsl(225,9%,20%)] text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors font-medium"
          >Normal</button>
        </div>
      )}
    </div>
  );
}

export default function CanvasEditor({ canvas, onClose, onUpdate }) {
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

  const save = async (val, extraFields = {}) => {
    const toSave = val !== undefined ? val : content;
    const updated = await base44.entities.Canvas.update(canvas.id, {
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
    await base44.entities.Canvas.update(canvas.id, { title: trimmed });
    onUpdate?.({ ...canvas, title: trimmed });
  };

  const togglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    await base44.entities.Canvas.update(canvas.id, { is_pinned: next });
    onUpdate?.({ ...canvas, is_pinned: next });
  };

  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    await base44.entities.Canvas.update(canvas.id, { is_favorite: next });
    onUpdate?.({ ...canvas, is_favorite: next });
  };

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimer.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div ref={editorContainerRef} className="relative z-10 flex flex-col w-full max-w-4xl h-[90vh] rounded-2xl border border-[hsl(225,9%,22%)] shadow-2xl overflow-hidden bg-[hsl(220,8%,13%)]">
        <style>{editorStyles}</style>
        <DictionaryContextMenu containerRef={editorContainerRef} />

        {/* Header */}
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
            <button onClick={onClose} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <Toolbar quillRef={quillRef} />

        {/* Editor */}
        <div className="vault-quill-wrapper flex-1 overflow-hidden">
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={handleChange}
            modules={modules}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          />
        </div>

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
    </div>
  );
}