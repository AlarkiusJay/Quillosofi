// Page Setup — paper presets, defaults, persistence, helpers.
//
// All sizes in INCHES. We convert to px for rendering at 96 DPI.
// (Word's "Custom size" dialog is in inches by default; we match.)
//
// View modes mirror Microsoft Word's View tab:
//   • pageMovement: 'vertical' | 'side-to-side'
//     - vertical = scroll up/down; pages stack
//     - side-to-side = horizontal book-spread, two facing pages
//   • pageLayout: 'one' | 'multiple'
//     - one = single page column (vertical only — N/A in side-to-side)
//     - multiple = grid of pages (vertical only — N/A in side-to-side)
//
// Persisted per-canvas in localStorage under quillosofi:pageSetup:<canvasId>.
// Falls back to a global default at quillosofi:pageSetup:_default.

export const PX_PER_INCH = 96;
export const inchToPx = (inches) => Math.round(inches * PX_PER_INCH);

// Combined Word + KDP trim sizes. Custom is always last.
export const PAPER_PRESETS = [
  // Word defaults
  { id: 'letter',   label: 'Letter (8.5 × 11")',          width: 8.5,   height: 11 },
  { id: 'legal',    label: 'Legal (8.5 × 14")',           width: 8.5,   height: 14 },
  { id: 'a4',       label: 'A4 (8.27 × 11.69")',          width: 8.27,  height: 11.69 },
  { id: 'a5',       label: 'A5 (5.83 × 8.27")',           width: 5.83,  height: 8.27 },
  { id: 'b5',       label: 'B5 (6.93 × 9.84")',           width: 6.93,  height: 9.84 },
  { id: 'tabloid',  label: 'Tabloid (11 × 17")',          width: 11,    height: 17 },
  { id: 'executive',label: 'Executive (7.25 × 10.5")',    width: 7.25,  height: 10.5 },
  // KDP / book trim sizes
  { id: 'kdp-5x8',     label: 'KDP 5 × 8"',               width: 5,     height: 8 },
  { id: 'kdp-525x8',   label: 'KDP 5.25 × 8"',            width: 5.25,  height: 8 },
  { id: 'kdp-55x85',   label: 'KDP 5.5 × 8.5"',           width: 5.5,   height: 8.5 },
  { id: 'kdp-6x9',     label: 'KDP 6 × 9"',               width: 6,     height: 9 },
  { id: 'kdp-614x921', label: 'KDP 6.14 × 9.21"',         width: 6.14,  height: 9.21 },
  { id: 'kdp-7x10',    label: 'KDP 7 × 10"',              width: 7,     height: 10 },
];

export const CUSTOM_PRESET_ID = 'custom';

// Word's defaults: 1" margins all around. Mirror-margin pairs use
// inside/outside instead of left/right.
export const DEFAULT_PAGE_SETUP = {
  paperPresetId: 'letter',
  paperWidth: 8.5,        // inches (driven by preset, but stored explicitly so custom works)
  paperHeight: 11,
  orientation: 'portrait', // 'portrait' | 'landscape'
  margins: {
    top: 1,
    bottom: 1,
    inside: 1,   // left in non-mirror mode
    outside: 1,  // right in non-mirror mode
    gutter: 0,
  },
  mirrorMargins: false,    // true = book mode (inside/outside), false = simple (left/right)
  // View
  pageMovement: 'vertical',  // 'vertical' | 'side-to-side'
  pageLayout: 'one',         // 'one' | 'multiple' (only meaningful in vertical)
  zoom: 1,                   // 0.5 .. 2 — visual scale of pages
};

// Effective dimensions after orientation flip.
export function effectiveDimensions(setup) {
  const { paperWidth, paperHeight, orientation } = setup;
  if (orientation === 'landscape') return { width: paperHeight, height: paperWidth };
  return { width: paperWidth, height: paperHeight };
}

// Resolve the four physical margins (top/bottom/left/right) from the stored
// setup. In mirror-margin mode this depends on whether the page is on the
// left or right side of the spread (recto/verso).
//   pageIndex 0-based. Even (0, 2, ...) = recto/right page, odd = verso/left.
export function resolvedMargins(setup, pageIndex = 0) {
  const { margins, mirrorMargins } = setup;
  if (!mirrorMargins) {
    return {
      top: margins.top,
      bottom: margins.bottom,
      left: margins.inside,    // when not mirrored, "inside" = left
      right: margins.outside,  // "outside" = right
    };
  }
  // Mirror: even page = recto (right side of spread, gutter on left)
  //         odd page  = verso (left side of spread, gutter on right)
  const isRecto = pageIndex % 2 === 0;
  return {
    top: margins.top,
    bottom: margins.bottom,
    left: isRecto ? (margins.inside + margins.gutter) : margins.outside,
    right: isRecto ? margins.outside : (margins.inside + margins.gutter),
  };
}

// ── Persistence ────────────────────────────────────────────────────────────
const KEY_PREFIX = 'quillosofi:pageSetup:';
const DEFAULT_KEY = `${KEY_PREFIX}_default`;

export function loadPageSetup(canvasId) {
  try {
    if (canvasId) {
      const raw = localStorage.getItem(`${KEY_PREFIX}${canvasId}`);
      if (raw) return { ...DEFAULT_PAGE_SETUP, ...JSON.parse(raw) };
    }
    const def = localStorage.getItem(DEFAULT_KEY);
    if (def) return { ...DEFAULT_PAGE_SETUP, ...JSON.parse(def) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PAGE_SETUP };
}

export function savePageSetup(canvasId, setup) {
  try {
    if (canvasId) {
      localStorage.setItem(`${KEY_PREFIX}${canvasId}`, JSON.stringify(setup));
    }
  } catch { /* ignore */ }
}

export function saveAsDefaultPageSetup(setup) {
  try { localStorage.setItem(DEFAULT_KEY, JSON.stringify(setup)); } catch { /* ignore */ }
}
