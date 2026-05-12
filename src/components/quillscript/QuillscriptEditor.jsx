// QuillscriptEditor — v0.6.10-Alpha1
//
// Single-Tiptap-instance editor for Quillscript (the default writing hub
// in v0.6). One editor per canvas, infinite scroll, no page frames, no
// paginator. This is what kills the v0.5.x cross-page select-all / drag-
// select / formatting-fanout class of bugs at the root: the entire doc
// lives in ONE editor instance, so the browser's native selection
// crosses any block boundary the way Word's does.
//
// Notion-style page header (emoji + cover + title) renders as a non-
// editable block above the editor body. The body is a single Tiptap
// instance using the same extensions as v0.5.82 (so all existing
// formatting — fonts, sizes, alignment, indentation, paragraph dialog —
// works unchanged).
//
// Pagination is OFF by default. When Quillginate (the togglable
// paginator) is ON for this canvas, this editor is unmounted in favour
// of the v0.5.82 TiptapPagedEditor. See CanvasEditor.jsx for the swap.

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { buildExtensions, TIPTAP_BASE_CSS } from '@/lib/tiptap/editorConfig';
import { migrateLegacyContent } from '@/lib/tiptap/migrateContent';

const QuillscriptEditor = forwardRef(function QuillscriptEditor(
  {
    canvas,
    initialHtml,
    onContentChange,
    onActiveEditorChange,
    onTitleChange,
    title,
  },
  ref,
) {
  // Seed once on canvas change. Re-mounting via key={canvas.id} in the
  // parent guarantees we get a fresh editor for each canvas, so we don't
  // need to handle mid-life content swaps here.
  const seedHtml = (() => {
    const migrated = migrateLegacyContent(initialHtml || '');
    return migrated.value;
  })();

  const editor = useEditor({
    extensions: buildExtensions({ placeholder: 'Start writing…' }),
    content: seedHtml,
    onUpdate({ editor }) {
      onContentChange?.(editor.getHTML());
    },
    onFocus({ editor }) {
      onActiveEditorChange?.(editor);
    },
    editorProps: {
      attributes: {
        'aria-label': `Canvas — ${canvas?.title || 'Untitled'}`,
        spellcheck: 'true',
      },
      // Single editor — default Cmd/Ctrl+A is exactly what we want, no
      // multi-page select-all dance needed. This is the whole point of
      // Quillscript: native selection works.
      transformPastedHTML(html) {
        // Same inline-unwrap behaviour as v0.5.82 so pastes from external
        // sources don't split the current paragraph unnecessarily.
        try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const body = doc.body;
          if (!body) return html;
          const blocks = Array.from(body.children);
          if (blocks.length === 1 && blocks[0].tagName === 'P') {
            return blocks[0].innerHTML;
          }
          return html;
        } catch {
          return html;
        }
      },
    },
  });

  // Expose the active editor to the parent so the bottom redux bar can
  // run formatting commands against it (legacy quillRef adapter still
  // works through the parent's adapter — see CanvasEditor.jsx).
  useEffect(() => {
    if (editor) onActiveEditorChange?.(editor);
  }, [editor, onActiveEditorChange]);

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      // For ParagraphDialog API parity — Quillscript has exactly one editor.
      getAllEditors: () => (editor ? [editor] : []),
      focus: () => editor?.commands.focus(),
    }),
    [editor],
  );

  const titleInputRef = useRef(null);

  return (
    <div className="quillscript-shell flex-1 overflow-y-auto">
      <style>{TIPTAP_BASE_CSS}</style>
      <style>{QUILLSCRIPT_HEADER_CSS}</style>
      <div className="quillscript-doc">
        {/* Notion-style page header block — emoji + title. Cover image
            is intentionally deferred to a later alpha (Alaria asked not
            to push AI/generated imagery and we don't have an asset
            picker yet). Emoji defaults to 📄, can be edited inline by
            clicking it (handled via a tiny inline picker — TODO Alpha 2). */}
        <header className="quillscript-header">
          <div className="quillscript-emoji" role="img" aria-label="Page emoji">
            {canvas?.emoji || '📄'}
          </div>
          <input
            ref={titleInputRef}
            className="quillscript-title-input"
            value={title}
            placeholder="Untitled"
            onChange={(e) => onTitleChange?.(e.target.value)}
            onKeyDown={(e) => {
              // Enter from the title hops focus to the body, like Notion.
              if (e.key === 'Enter') {
                e.preventDefault();
                editor?.commands.focus('start');
              }
            }}
            aria-label="Canvas title"
          />
        </header>

        {/* Single editor body — no page frame, no paginator. */}
        <div className="quillscript-body">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

// Quillscript-specific overrides on top of TIPTAP_BASE_CSS. Keeps the
// chalkboard aesthetic Alaria locked in — light parchment surface,
// generous max-width, Oldenburg display title.
const QUILLSCRIPT_HEADER_CSS = `
  .quillscript-shell {
    background: hsl(220, 12%, 9%);
  }
  .quillscript-doc {
    max-width: 740px;
    margin: 0 auto;
    padding: 64px 56px 240px;
    color: hsl(220, 30%, 12%);
    background: hsl(43, 36%, 92%);
    min-height: 100%;
    box-shadow: 0 0 0 1px hsl(220, 8%, 22%) inset;
  }
  .quillscript-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }
  .quillscript-emoji {
    font-size: 64px;
    line-height: 1;
    cursor: pointer;
    user-select: none;
    width: max-content;
    transition: transform 0.12s ease;
  }
  .quillscript-emoji:hover { transform: scale(1.08); }
  .quillscript-title-input {
    font-family: 'Oldenburg', serif;
    font-size: 40px;
    font-weight: 400;
    line-height: 1.15;
    color: hsl(220, 30%, 12%);
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    padding: 0;
  }
  .quillscript-title-input::placeholder {
    color: hsl(220, 12%, 55%);
  }
  .quillscript-body .tiptap {
    min-height: 60vh;
    padding: 0;
    background: transparent;
    color: hsl(220, 30%, 12%);
  }
  .quillscript-body .tiptap:focus { outline: none; }
`;

export default QuillscriptEditor;
