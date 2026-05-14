// editorConfig — shared Tiptap extension list + base CSS used by every
// CanvasEditor instance (vertical mode = 1 instance, side-to-side = N
// instances, one per page).

import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

import FontSize from './extensions/FontSize';
import LineHeight from './extensions/LineHeight';
import Indent from './extensions/Indent';
import ParagraphFormat from './extensions/ParagraphFormat';
import LiteralTab from './extensions/LiteralTab';
import HardPageBreak from './extensions/HardPageBreak';

export function buildExtensions({ placeholder = '' } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // We provide our own LiteralTab keymap; StarterKit's list-keymap is
      // still active for nesting bullets.
    }),
    Underline,
    TextStyle,
    FontSize,
    LineHeight,
    Indent,
    ParagraphFormat,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Placeholder.configure({
      placeholder: placeholder,
      showOnlyCurrent: false,
      includeChildren: false,
    }),
    LiteralTab,
    HardPageBreak,
  ];
}

// Base editor styles. Same chalkboard look the v0.4.x Quill editor used,
// adapted for Tiptap's `.tiptap` class (which is the editable root in
// Tiptap-React rather than `.ql-editor`).
export const TIPTAP_BASE_CSS = `
  .canvas-tiptap-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }
  .canvas-tiptap-wrapper .tiptap {
    color: hsl(220, 30%, 12%);
    font-family: 'Oldenburg', serif;
    line-height: 1.7;
    outline: none !important;
    box-shadow: none !important;
    min-height: 100%;
    padding: 0;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    tab-size: 4;
    -moz-tab-size: 4;
  }
  .canvas-tiptap-wrapper .tiptap:focus,
  .canvas-tiptap-wrapper .tiptap:focus-visible {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
  }
  /* Headings */
  .canvas-tiptap-wrapper .tiptap h1 { font-size: 2em; font-weight: 700; margin: 12px 0 6px; }
  .canvas-tiptap-wrapper .tiptap h2 { font-size: 1.5em; font-weight: 700; margin: 10px 0 5px; }
  .canvas-tiptap-wrapper .tiptap h3 { font-size: 1.2em; font-weight: 700; margin: 8px 0 4px; }
  .canvas-tiptap-wrapper .tiptap p { margin: 4px 0; }
  /* Lists */
  .canvas-tiptap-wrapper .tiptap ul,
  .canvas-tiptap-wrapper .tiptap ol { padding-left: 1.8em; margin: 6px 0; }
  .canvas-tiptap-wrapper .tiptap li { margin: 3px 0; line-height: 1.6; }
  .canvas-tiptap-wrapper .tiptap li > p { margin: 0; }
  /* Quote / code */
  .canvas-tiptap-wrapper .tiptap blockquote {
    border-left: 4px solid hsl(235,86%,55%);
    padding-left: 14px;
    margin: 8px 0;
    color: hsl(220,12%,30%);
    font-style: italic;
  }
  .canvas-tiptap-wrapper .tiptap pre {
    background: hsl(220, 8%, 92%);
    color: hsl(220, 30%, 12%);
    border-radius: 6px;
    padding: 14px;
    font-family: ui-monospace, 'Menlo', monospace;
    font-size: 12px;
    overflow-x: auto;
  }
  .canvas-tiptap-wrapper .tiptap code {
    background: hsl(220, 8%, 92%);
    color: hsl(220, 30%, 12%);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
  }
  .canvas-tiptap-wrapper .tiptap hr {
    border: none;
    border-top: 1px solid hsl(220, 8%, 70%);
    margin: 14px 0;
  }
  /* Hard page break — explicit writer-controlled break.
     Dashed chalkboard rule with a small caps label. Visible in
     Quillscript and Quillginate alike so writers always see where
     they've committed a forced break. */
  .canvas-tiptap-wrapper .tiptap hr.hard-page-break {
    border: none;
    border-top: 1.5px dashed hsl(150, 22%, 40%);
    margin: 18px 0;
    position: relative;
    overflow: visible;
    height: 0;
    cursor: pointer;
  }
  .canvas-tiptap-wrapper .tiptap hr.hard-page-break::after {
    content: 'PAGE BREAK';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(150, 22%, 96%);
    color: hsl(150, 22%, 36%);
    font-family: ui-monospace, 'Menlo', monospace;
    font-size: 9px;
    letter-spacing: 0.18em;
    padding: 1px 8px;
    border-radius: 2px;
  }
  .canvas-tiptap-wrapper .tiptap hr.hard-page-break.ProseMirror-selectednode::after {
    background: hsl(45, 80%, 60%);
    color: hsl(150, 30%, 14%);
  }
  .canvas-tiptap-wrapper .tiptap a {
    color: hsl(235, 80%, 45%);
    text-decoration: underline;
  }
  /* Placeholder hint */
  .canvas-tiptap-wrapper .tiptap p.is-editor-empty:first-child::before {
    color: hsl(220, 8%, 55%);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;

export default { buildExtensions, TIPTAP_BASE_CSS };
