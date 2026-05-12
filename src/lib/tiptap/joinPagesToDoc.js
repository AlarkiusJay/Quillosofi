// joinPagesToDoc — v0.6.10 migration shim.
//
// Alpha 1 of the v0.6 cycle ships Quillscript as a single-editor experience
// (no paginator running by default). Canvases authored in v0.5.x carry two
// parallel stores:
//
//   • `content`  — HTML blob, source of truth for continuous-single mode
//   • `pages[]`  — HTML chunks per page, used by paginated and spread modes
//
// In v0.5.71+ those two stores were kept in sync, so for the overwhelming
// majority of canvases `content === pages.join('')`. But there are edge
// cases where `pages` is fresher than `content` (e.g. paginated mode never
// switched back to vertical-single before save). To make the v0.6 swap
// silent and safe, we always derive a single doc HTML from whichever store
// holds the latest data:
//
//   1. If `pages` is a non-empty array, join it. Pages are full block-level
//      HTML strings so we concatenate without a separator (matches the
//      v0.5.71 join logic in CanvasEditor.handlePagesChange).
//   2. Otherwise, fall back to `content` (or empty string).
//
// The shim is intentionally lossless and idempotent. Running it twice on
// the same canvas yields the same HTML. Quillscript saves only `content`
// going forward; `pages` is left alone so that Quillginate (Alpha 2) can
// repaginate from the same source without conflict.

export function joinPagesToDoc(canvas) {
  if (!canvas) return '';

  // Prefer pages[] when present — it's the freshest store in any v0.5.x
  // canvas that was last opened in paginated/spread mode.
  if (Array.isArray(canvas.pages) && canvas.pages.length > 0) {
    const joined = canvas.pages
      .map((p) => (typeof p === 'string' ? p : ''))
      .join('');
    if (joined.trim()) return joined;
  }

  return canvas.content || '';
}

// Inverse — used by Quillginate (Alpha 2) when activating the paginator
// for a canvas. Splits a single HTML blob into top-level blocks so the
// overflow controller can repaginate from scratch. Quillginate's own
// pagination controller does the actual page-fitting; this just slices
// at block boundaries so we don't start with one mega-block.
//
// Importantly this does NOT mutate the canvas — Quillginate writes its
// own pages[] back, and Quillscript keeps editing `content`. The two
// stay in sync only while Quillginate is active (see Alpha 2 sync ring).
export function splitDocToBlocks(html) {
  if (!html || typeof html !== 'string') return [''];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [html];
  const blocks = Array.from(root.children).map((el) => el.outerHTML);
  return blocks.length ? blocks : [html];
}
