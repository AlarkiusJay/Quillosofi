// QuillscriptEditor — v0.6.10-Alpha1 → v0.6.65-Alpha2
//
// Single-Tiptap-instance editor for Quillscript (the default writing hub
// in v0.6). One editor per canvas, infinite scroll, no page frames, no
// paginator. This is what kills the v0.5.x cross-page select-all / drag-
// select / formatting-fanout class of bugs at the root: the entire doc
// lives in ONE editor instance, so the browser's native selection
// crosses any block boundary the way Word's does.
//
// Notion-style page header (cover + emoji + title) renders as a non-
// editable block above the editor body.
//
// Alpha 2 additions:
//   • Emoji picker (click the 📄 → curated 120-emoji popover)
//   • Cover swatch picker (12-swatch chalkboard palette, NO AI / external imagery)
//   • Inline title rename works via direct input (committed onBlur via parent autosave)
//
// Pagination is OFF by default. When Quillginate (the togglable
// paginator) is ON for this canvas, this editor is unmounted in favour
// of the v0.5.82 TiptapPagedEditor. See CanvasEditor.jsx for the swap.

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Image as ImageIcon } from 'lucide-react';
import { buildExtensions, TIPTAP_BASE_CSS } from '@/lib/tiptap/editorConfig';
import { migrateLegacyContent } from '@/lib/tiptap/migrateContent';
import EmojiPicker from './EmojiPicker';
import CoverPicker, { getCoverBg } from './CoverPicker';

const QuillscriptEditor = forwardRef(function QuillscriptEditor(
  {
    canvas,
    initialHtml,
    onContentChange,
    onActiveEditorChange,
    onTitleChange,
    onEmojiChange,
    onCoverChange,
    title,
    emoji,
    coverId,
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
  const emojiBtnRef = useRef(null);
  const coverBtnRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCover, setShowCover] = useState(false);

  const coverBg = getCoverBg(coverId);

  return (
    <div className="quillscript-shell flex-1 overflow-y-auto">
      <style>{TIPTAP_BASE_CSS}</style>
      <style>{QUILLSCRIPT_HEADER_CSS}</style>
      <div className="quillscript-doc">
        {/* Cover banner — Alpha 2. Curated CSS-gradient swatches only.
            Renders above emoji+title; click hover-state to swap or remove. */}
        {coverBg && (
          <div
            className="quillscript-cover"
            style={{ background: coverBg }}
            ref={coverBtnRef}
          >
            <button
              type="button"
              onClick={() => setShowCover((v) => !v)}
              className="quillscript-cover-edit"
              title="Change cover"
            >
              <ImageIcon className="h-3 w-3" />
              <span>Change cover</span>
            </button>
          </div>
        )}

        {/* Notion-style page header — emoji + title + add-cover affordance. */}
        <header className={`quillscript-header ${coverBg ? 'with-cover' : ''}`}>
          <button
            ref={emojiBtnRef}
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="quillscript-emoji"
            aria-label="Change emoji"
            title="Click to pick a different emoji"
          >
            {emoji || canvas?.emoji || '📄'}
          </button>

          {!coverBg && (
            <button
              ref={coverBtnRef}
              type="button"
              onClick={() => setShowCover((v) => !v)}
              className="quillscript-add-cover"
              title="Add a cover"
            >
              <ImageIcon className="h-3 w-3" />
              <span>Add cover</span>
            </button>
          )}

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

      {showEmoji && (
        <EmojiPicker
          anchorRef={emojiBtnRef}
          onPick={(e) => onEmojiChange?.(e)}
          onClose={() => setShowEmoji(false)}
        />
      )}
      {showCover && (
        <CoverPicker
          anchorRef={coverBtnRef}
          currentCoverId={coverId}
          onPick={(id) => onCoverChange?.(id)}
          onRemove={() => onCoverChange?.(null)}
          onClose={() => setShowCover(false)}
        />
      )}
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
    padding: 0 56px 240px;
    color: hsl(220, 30%, 12%);
    background: hsl(43, 36%, 92%);
    min-height: 100%;
    box-shadow: 0 0 0 1px hsl(220, 8%, 22%) inset;
    position: relative;
  }
  .quillscript-cover {
    margin: 0 -56px 16px;
    height: 160px;
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 8px;
  }
  .quillscript-cover-edit {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-family: ui-monospace, 'Menlo', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: white;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .quillscript-cover:hover .quillscript-cover-edit { opacity: 1; }
  .quillscript-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 28px;
    padding-top: 64px;
  }
  .quillscript-header.with-cover { padding-top: 0; }
  .quillscript-emoji {
    font-size: 64px;
    line-height: 1;
    cursor: pointer;
    user-select: none;
    width: max-content;
    background: transparent;
    border: none;
    padding: 0;
    transition: transform 0.12s ease;
  }
  .quillscript-emoji:hover { transform: scale(1.08); }
  .quillscript-add-cover {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-family: ui-monospace, 'Menlo', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: hsl(220, 30%, 35%);
    background: transparent;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .quillscript-header:hover .quillscript-add-cover { opacity: 1; }
  .quillscript-add-cover:hover { color: hsl(220, 30%, 12%); }
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
