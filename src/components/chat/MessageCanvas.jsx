import { useState, useRef, useCallback, useEffect } from 'react';
import { exportTxt, exportMd, exportDocx, exportPdf } from '../vault/canvasExportUtils';
 import ReactQuill from 'react-quill';
 import { base44 } from '@/api/base44Client';
import { X, Save, Maximize2, Minimize2, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Link, Heading2, Minus, Download, Upload, ChevronDown, BookPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const modules = { toolbar: false };

function CanvasToolbar({ quillRef }) {
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

  const insert = useCallback((format, value) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    const range = q.getSelection?.(true);
    if (!range) return;
    q.insertText(range.index, value);
    q.setSelection(range.index + value.length);
  }, [quillRef]);

  const Btn = ({ icon: Icon, title, onClick, label }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-6 min-w-6 px-1 rounded text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-xs font-mono flex items-center justify-center"
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : label}
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-[hsl(225,9%,22%)] mx-0.5" />;

  return (
    <div className="border-b border-[hsl(225,9%,15%)]">
      <div className="flex items-center gap-0.5 px-2 py-1 flex-wrap">
        {/* Headings */}
        <Btn icon={Heading2} title="Headings" onClick={() => setShowHeadings(v => !v)} />
        <Divider />
        <Btn icon={Bold}          title="Bold"          onClick={() => fmt('bold', true)} />
        <Btn icon={Italic}        title="Italic"        onClick={() => fmt('italic', true)} />
        <Btn icon={Underline}     title="Underline"     onClick={() => fmt('underline', true)} />
        <Btn icon={Strikethrough} title="Strikethrough" onClick={() => fmt('strike', true)} />
        <Divider />
        <Btn icon={List}          title="Bullet list"   onClick={() => fmt('list', 'bullet')} />
        <Btn icon={ListOrdered}   title="Numbered list" onClick={() => fmt('list', 'ordered')} />
        <Btn icon={Quote}         title="Blockquote"    onClick={() => fmt('blockquote', true)} />
        <Divider />
        <Btn icon={Code}          title="Code block"    onClick={() => fmt('code-block', true)} />
        <Btn icon={Link}          title="Link"          onClick={() => {
          const url = prompt('Enter URL:');
          if (url) fmt('link', url);
        }} />
        <Divider />
        <Btn icon={Minus}         title="Divider"        onClick={() => insert('hr', '────────────────────────')} />
      </div>

      {showHeadings && (
        <div className="flex items-center gap-1 px-2 pb-1.5 flex-wrap overflow-x-auto">
          {[1, 2, 3].map(h => (
            <button
              key={h}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fmt('header', h); setShowHeadings(false); }}
              className="px-2.5 py-0.5 text-xs rounded border border-[hsl(225,9%,20%)] text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors font-medium shrink-0 whitespace-nowrap"
            >
              H{h}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); fmt('header', false); setShowHeadings(false); }}
            className="px-2.5 py-0.5 text-xs rounded border border-[hsl(225,9%,20%)] text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors font-medium shrink-0 whitespace-nowrap"
          >
            Normal
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessageCanvas({ message, onClose, onSave: onSaveCallback }) {
  const [content, setContent] = useState(message.canvas_content || '');
  const [title, setTitle] = useState(message.canvas_title || 'Canvas');
  const [editingTitle, setEditingTitle] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [savedLabel, setSavedLabel] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const autoSaveTimer = useRef(null);
  const quillRef = useRef(null);
  const canvasRef = useRef(null);
  const importRef = useRef(null);
  const [showExport, setShowExport] = useState(false);
  const [dictToast, setDictToast] = useState('');

  const handleAddToDictionary = async () => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const range = q.getSelection?.();
    if (!range || range.length === 0) { setDictToast('Select a word first'); setTimeout(() => setDictToast(''), 2000); return; }
    const word = q.getText(range.index, range.length).trim();
    if (!word) return;
    await base44.entities.CustomWord.create({ word });
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
      const html = text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<p><br></p>').join('');
      setContent(html);
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => save(html), 1200);
    };
    reader.readAsText(file);
    e.target.value = '';
  };





  const save = async (val) => {
    const toSave = val !== undefined ? val : content;
    await base44.entities.Message.update(message.id, { canvas_content: toSave, canvas_title: title });
    // Also upsert into Canvas Vault
    const existing = await base44.entities.Canvas.filter({ message_id: message.id });
    if (existing.length > 0) {
      await base44.entities.Canvas.update(existing[0].id, { content: toSave, title });
    } else {
      await base44.entities.Canvas.create({
        title,
        content: toSave,
        message_id: message.id,
        conversation_id: message.conversation_id || '',
      });
    }
    onSaveCallback?.(message.id, toSave);
    setSavedLabel('Saved!');
    setTimeout(() => setSavedLabel(''), 1500);
  };

  const saveTitle = async (newTitle) => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      setTitle(trimmed);
      await base44.entities.Message.update(message.id, { canvas_title: trimmed });
    } else {
      setTitle(title);
    }
    setEditingTitle(false);
  };

  const handleChange = (val) => {
    setContent(val);
    
    if (autoSave) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => save(val), 1000);
    }
  };

  const editorStyles = `
    .canvas-quill-wrapper { width: 100%; display: flex; flex-direction: column; }
    .canvas-quill-wrapper .ql-container { background: transparent; border: none; font-size: 13px; color: hsl(220, 14%, 90%); flex: 1; overflow-y: auto; }
    .canvas-quill-wrapper.fullscreen .ql-container { height: 100%; }
    .canvas-quill-wrapper.fullscreen .ql-editor { min-height: 100%; }
    .canvas-quill-wrapper .ql-editor { padding: 12px; word-break: break-word; overflow-wrap: break-word; min-height: 100px; font-size: 14px; }
    .canvas-quill-wrapper .ql-editor.ql-blank::before { color: hsl(220,7%,40%); font-style: normal; }
    .canvas-quill-wrapper .ql-editor h1 { font-size: 1.8em; font-weight: 700; margin: 10px 0 5px; }
    .canvas-quill-wrapper .ql-editor h2 { font-size: 1.4em; font-weight: 700; margin: 8px 0 4px; }
    .canvas-quill-wrapper .ql-editor h3 { font-size: 1.15em; font-weight: 700; margin: 6px 0 3px; }
    .canvas-quill-wrapper .ql-editor p { margin: 4px 0; }
    .canvas-quill-wrapper .ql-editor blockquote { border-left: 4px solid hsl(235,86%,65%); padding-left: 12px; margin: 6px 0; color: hsl(220,7%,60%); font-style: italic; }
    .canvas-quill-wrapper .ql-editor pre.ql-syntax { background: hsl(220,8%,14%); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto; }
    .canvas-quill-wrapper .ql-editor a { color: hsl(235,86%,75%); text-decoration: underline; cursor: pointer; }
    .canvas-quill-wrapper .ql-editor ul, .canvas-quill-wrapper .ql-editor ol { padding-left: 1.5em; margin: 4px 0; }
    .canvas-quill-wrapper .ql-editor li { margin: 2px 0; }
    .canvas-quill-wrapper .ql-editor hr { border: none; border-top: 1px solid hsl(225,9%,22%); margin: 12px 0; }
    .canvas-quill-wrapper .ql-editor strong { font-weight: 700; }
    .canvas-quill-wrapper .ql-editor em { font-style: italic; }
    .canvas-quill-wrapper .ql-editor u { text-decoration: underline; }
    .canvas-quill-wrapper .ql-editor s { text-decoration: line-through; }
    .canvas-quill-wrapper .ql-editor code { background: hsl(220,8%,14%); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 12px; }
    .canvas-quill-wrapper .ql-editor hr { border: none; border-top: 1px solid hsl(225,9%,22%); margin: 16px 0; height: 0; }
    @media (max-width: 768px) {
      .canvas-quill-wrapper .ql-editor hr { margin: 12px 0; }
    }
    @media (max-width: 768px) {
      .canvas-quill-wrapper .ql-editor { padding: 10px; font-size: 14px; }
      .canvas-quill-wrapper .ql-editor h1 { font-size: 1.5em; }
      .canvas-quill-wrapper .ql-editor h2 { font-size: 1.2em; }
    }
  `;

  const inner = (
    <>
      {/* Header */}
       <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(225,9%,20%)] shrink-0">
         {editingTitle ? (
           <input
             autoFocus
             value={title}
             onChange={(e) => setTitle(e.target.value)}
             onBlur={() => saveTitle(title)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') saveTitle(title);
               if (e.key === 'Escape') { setTitle(message.canvas_title || 'Canvas'); setEditingTitle(false); }
             }}
             className="text-xs font-semibold text-green-400 bg-[hsl(228,8%,27%)] border border-primary/50 rounded px-2 py-0.5 focus:outline-none w-32"
           />
         ) : (
           <button onClick={() => setEditingTitle(true)} className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors cursor-pointer" title="Click to edit title">
             📄 {title}
           </button>
         )}
         <div className="flex items-center gap-2">
          {savedLabel && <span className="text-[10px] text-green-400">{savedLabel}</span>}
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium ${
              autoSave ? 'border-primary bg-primary/10 text-primary' : 'border-[hsl(225,9%,25%)] text-[hsl(220,7%,50%)] hover:text-white'
            }`}
          >
            Auto-save
          </button>
          <input ref={importRef} type="file" accept=".txt,.md" className="hidden" onChange={handleImport} />
          <button onClick={() => importRef.current?.click()} title="Import TXT or MD" className="text-[hsl(220,7%,55%)] hover:text-white transition-colors">
            <Upload className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)} title="Export" className="flex items-center gap-0.5 text-[hsl(220,7%,55%)] hover:text-white transition-colors">
              <Download className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-6 z-50 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-xl shadow-2xl p-1 min-w-28">
                  {['txt','md','docx','pdf'].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg text-[hsl(220,7%,65%)] hover:bg-[hsl(228,7%,25%)] hover:text-white transition-colors uppercase font-mono tracking-wider">
                      .{fmt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {dictToast && <span className="text-[10px] text-green-400 whitespace-nowrap">{dictToast}</span>}
          <button onClick={handleAddToDictionary} title="Add selected text to Custom Dictionary" className="text-[hsl(220,7%,55%)] hover:text-white transition-colors">
            <BookPlus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => save()} className="text-[hsl(220,7%,55%)] hover:text-white transition-colors" title="Save">
            <Save className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="text-[hsl(220,7%,55%)] hover:text-white transition-colors" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
             {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
           </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <CanvasToolbar quillRef={quillRef} />

      {/* Editor */}
      <div className={`canvas-quill-wrapper${fullscreen ? ' fullscreen' : ''}`} style={fullscreen ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : {}}>
        <style>{editorStyles}</style>
        <ReactQuill
          ref={quillRef}
          value={content}
          onChange={handleChange}
          modules={modules}
          placeholder="Write notes, context, or anything for Zetryl to read..."
          style={fullscreen ? { width: '100%', flex: 1, display: 'flex', flexDirection: 'column' } : { width: '100%' }}
        />
      </div>
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-0">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setFullscreen(false)} />
        <div className="relative z-10 flex flex-col w-full md:w-[90vw] md:max-w-5xl h-[85vh] md:h-[82vh] rounded-xl md:rounded-2xl border border-[hsl(225,9%,25%)] shadow-2xl overflow-hidden bg-[hsl(220,8%,16%)]">
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="mt-2 w-full rounded-lg md:rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] overflow-hidden text-left" style={{ minWidth: 0 }}>
      {inner}
    </div>
  );
}