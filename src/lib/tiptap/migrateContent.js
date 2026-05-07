// migrateContent — converts legacy Quill HTML (or plain text) into a form
// Tiptap can render. Tiptap accepts HTML directly via setContent(html), and
// our custom extensions parse the relevant inline styles and ql-indent-N
// classes back into block attributes. So most canvases need zero changes.
//
// This module does light cleanup:
//   • <p><br></p> → <p></p>  (Quill's empty paragraph marker; Tiptap renders
//                              it as an extra blank line otherwise)
//   • Strip Quill-specific spans that wrap the entire editor content
//   • Convert the legacy <span class="ql-size-large"> classnames to inline
//     style font-size (rare, only present on canvases edited before v0.4.x)
//
// Returns either { kind: 'html', value: '...' } or { kind: 'empty' }.

const QUILL_SIZE_CLASS_TO_PX = {
  'ql-size-small': '12px',
  'ql-size-large': '20px',
  'ql-size-huge': '32px',
};

export function migrateLegacyContent(rawHtml) {
  if (!rawHtml) return { kind: 'empty', value: '' };
  const trimmed = String(rawHtml).trim();
  if (!trimmed || trimmed === '<p><br></p>' || trimmed === '<p></p>') {
    return { kind: 'empty', value: '' };
  }

  let html = trimmed;

  // <p><br></p> → <p></p>
  html = html.replace(/<p><br\s*\/?><\/p>/gi, '<p></p>');

  // ql-size-* class → inline font-size style on the same span
  html = html.replace(
    /class="([^"]*)"/gi,
    (full, cls) => {
      let pxOverride = null;
      for (const [k, v] of Object.entries(QUILL_SIZE_CLASS_TO_PX)) {
        if (cls.includes(k)) {
          pxOverride = v;
          cls = cls.replace(k, '').trim();
          break;
        }
      }
      const out = cls ? `class="${cls}"` : '';
      return pxOverride
        ? `${out} style="font-size: ${pxOverride}"`
        : out;
    }
  );

  return { kind: 'html', value: html };
}

export default migrateLegacyContent;
