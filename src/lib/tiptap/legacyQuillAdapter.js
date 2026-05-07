// legacyQuillAdapter — translates the small subset of Quill's API that
// CanvasRuler and HeaderNavigator depend on, backed by a Tiptap editor.
//
// CanvasRuler calls these:
//   q.getFormat()                                   → block + inline marks
//   q.getSelection()                                → { index, length } (rough)
//   q.format(name, value, source)                   → applies attribute
//   q.root                                          → DOM element of editor
//
// HeaderNavigator calls:
//   q.root                                          → reads h1/h2/h3 from DOM
//
// Quill's `format` names we map:
//   indent           → Indent extension (level 0..8)
//   text-indent      → first-line indent (treated as inline mark, ignored for v0.5.0
//                      first-cut — first-line indent inside ProseMirror needs its own
//                      block attr; deferred to v0.5.1)
//   padding-right    → right-margin marker on paragraph (deferred to v0.5.1, no-op)
//   size             → fontSize via FontSize extension
//   line-height      → lineHeight via LineHeight extension
//   bold/italic/etc. → standard StarterKit marks
//
// This is a defensive adapter — unknown formats become no-ops instead of
// throwing, matching Quill's lenient API. Lets the existing ruler component
// work with zero changes during the v0.5.0 migration.
//
// Event mapping (CanvasRuler binds q.on('selection-change') + q.on('text-change')):
//   selection-change → Tiptap 'selectionUpdate'
//   text-change      → Tiptap 'update'
// We keep a per-editor bridge map so `off` can find the same wrapper that `on`
// installed (Quill's API gives raw handler refs back).

const editorBridges = new WeakMap();

function getBridges(editor) {
  let map = editorBridges.get(editor);
  if (!map) {
    map = new Map(); // userHandler → { tiptapEvent, wrapper }
    editorBridges.set(editor, map);
  }
  return map;
}

function quillEventToTiptap(name) {
  if (name === 'selection-change') return 'selectionUpdate';
  if (name === 'text-change') return 'update';
  return null;
}

export function makeLegacyQuillAdapter(getActiveEditor) {
  return {
    getEditor() {
      const editor = getActiveEditor?.();
      if (!editor) return null;

      return {
        get root() {
          return editor.view?.dom || null;
        },
        focus() {
          editor.commands.focus();
        },
        getFormat(_range) {
          // Returns a flat object with mark + node attributes.
          const out = {};
          // Inline marks — collect from active marks.
          if (editor.isActive('bold')) out.bold = true;
          if (editor.isActive('italic')) out.italic = true;
          if (editor.isActive('underline')) out.underline = true;
          if (editor.isActive('strike')) out.strike = true;
          if (editor.isActive('code')) out.code = true;
          // Block-level.
          if (editor.isActive('heading', { level: 1 })) out.header = 1;
          else if (editor.isActive('heading', { level: 2 })) out.header = 2;
          else if (editor.isActive('heading', { level: 3 })) out.header = 3;
          if (editor.isActive('bulletList')) out.list = 'bullet';
          if (editor.isActive('orderedList')) out.list = 'ordered';
          if (editor.isActive('blockquote')) out.blockquote = true;
          if (editor.isActive('codeBlock')) out['code-block'] = true;
          // Alignment.
          if (editor.isActive({ textAlign: 'left' })) out.align = false;
          else if (editor.isActive({ textAlign: 'center' })) out.align = 'center';
          else if (editor.isActive({ textAlign: 'right' })) out.align = 'right';
          else if (editor.isActive({ textAlign: 'justify' })) out.align = 'justify';
          // Indent.
          const paraAttrs = editor.getAttributes('paragraph');
          const headAttrs = editor.getAttributes('heading');
          const lvl = parseInt(paraAttrs.indentLevel || headAttrs.indentLevel || 0, 10);
          if (lvl > 0) out.indent = lvl;
          // Font size.
          const ts = editor.getAttributes('textStyle');
          if (ts.fontSize) out.size = ts.fontSize;
          // Line height.
          const lh = paraAttrs.lineHeight || headAttrs.lineHeight;
          if (lh) out['line-height'] = lh;
          return out;
        },
        getSelection(_focus) {
          const sel = editor.state.selection;
          return { index: sel.from, length: sel.to - sel.from };
        },
        format(name, value /* , _source */) {
          const chain = editor.chain().focus();
          switch (name) {
            case 'bold': value ? chain.setBold().run() : chain.unsetBold().run(); return;
            case 'italic': value ? chain.setItalic().run() : chain.unsetItalic().run(); return;
            case 'underline': value ? chain.setUnderline().run() : chain.unsetUnderline().run(); return;
            case 'strike': value ? chain.setStrike().run() : chain.unsetStrike().run(); return;
            case 'code': value ? chain.setCode().run() : chain.unsetCode().run(); return;
            case 'header': {
              if (!value || value === false) chain.setParagraph().run();
              else chain.toggleHeading({ level: parseInt(value, 10) }).run();
              return;
            }
            case 'list': {
              if (value === 'bullet') chain.toggleBulletList().run();
              else if (value === 'ordered') chain.toggleOrderedList().run();
              return;
            }
            case 'blockquote': value ? chain.setBlockquote().run() : chain.unsetBlockquote().run(); return;
            case 'code-block': value ? chain.setCodeBlock().run() : chain.unsetCodeBlock().run(); return;
            case 'align': {
              if (!value || value === false) chain.setTextAlign('left').run();
              else chain.setTextAlign(value).run();
              return;
            }
            case 'indent': {
              const lvl = Math.max(0, Math.min(8, parseInt(value, 10) || 0));
              chain.setIndent(lvl).run();
              return;
            }
            case 'size': {
              if (!value || value === false) chain.unsetFontSize().run();
              else chain.setFontSize(value).run();
              return;
            }
            case 'line-height': {
              if (!value || value === false) chain.unsetLineHeight().run();
              else chain.setLineHeight(value).run();
              return;
            }
            case 'link': {
              if (!value) chain.unsetLink().run();
              else chain.setLink({ href: value, target: '_blank' }).run();
              return;
            }
            // No-op for ones that don't translate cleanly. Deferred to v0.5.1.
            case 'text-indent':
            case 'padding-right':
              return;
            default:
              return;
          }
        },
        getText(from, length) {
          const to = (from || 0) + (length || 0);
          return editor.state.doc.textBetween(from || 0, to, '\n');
        },
        deleteText(from, length /* , _source */) {
          const to = (from || 0) + (length || 0);
          editor.chain().focus().deleteRange({ from, to }).run();
        },
        insertText(from, text /* , _source */) {
          editor.chain().focus().insertContentAt(from, text).run();
        },
        setSelection(index, length /* , _source */) {
          editor.chain().focus().setTextSelection({ from: index, to: (index || 0) + (length || 0) }).run();
        },
        on(eventName, handler) {
          const tt = quillEventToTiptap(eventName);
          if (!tt || typeof handler !== 'function') return;
          const bridges = getBridges(editor);
          // Wrap so the handler signature matches Quill's roughly — for our use
          // (CanvasRuler) the args are ignored, but pass through anyway.
          const wrapper = () => {
            try { handler(); } catch { /* swallow — match Quill leniency */ }
          };
          bridges.set(handler, { tiptapEvent: tt, wrapper });
          editor.on(tt, wrapper);
        },
        off(eventName, handler) {
          const bridges = getBridges(editor);
          const entry = bridges.get(handler);
          if (!entry) return;
          editor.off(entry.tiptapEvent, entry.wrapper);
          bridges.delete(handler);
        },
      };
    },
  };
}

export default makeLegacyQuillAdapter;
