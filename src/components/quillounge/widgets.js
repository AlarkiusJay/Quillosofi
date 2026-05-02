/*
 * Quillounge widget registry + persistence layer.
 *
 * Each widget is identified by a stable type id ('todo', 'pinnedRecent',
 * 'todaysPrompt', 'greeting'). The user's per-instance state — layout,
 * opacity, theme, custom data — is persisted to localStorage so it survives
 * reloads.
 */

const LAYOUT_KEY = 'quillosofi:quillounge:layout';
const STATE_KEY = 'quillosofi:quillounge:state';
const CUSTOMIZED_KEY = 'quillosofi:quillounge:layout:customized';

// Column counts must match Quillounge's <ResponsiveGridLayout cols={...}>.
// Centralised here so derive logic + the page can't drift apart.
export const BREAKPOINT_COLS = { lg: 12, md: 8, sm: 4 };
export const BREAKPOINTS = { lg: 1280, md: 960, sm: 640 };

// 12-column grid. Each entry: { i, x, y, w, h, minW, minH }.
export const DEFAULT_LAYOUT = [
  { i: 'greeting',     x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
  { i: 'todaysPrompt', x: 0, y: 2, w: 6,  h: 4, minW: 3, minH: 3 },
  { i: 'todo',         x: 6, y: 2, w: 6,  h: 6, minW: 3, minH: 3 },
  { i: 'pinnedRecent', x: 0, y: 6, w: 6,  h: 4, minW: 3, minH: 3 },
];

// v0.4.20: themes are now sticky-note PAPER colors. The pre-redesign theme
// keys (glass/rose/lavender/teal) are aliased to the closest sticky color
// so existing user preferences in localStorage don't break on upgrade.
export const DEFAULT_WIDGET_STATE = {
  greeting:     { opacity: 1.00, theme: 'manila' },
  todaysPrompt: { opacity: 1.00, theme: 'pink' },
  todo:         { opacity: 1.00, theme: 'lavender' },
  pinnedRecent: { opacity: 1.00, theme: 'mint' },
};

// Sticky note paper palette. `paper` is the HSL var the .sticky-note CSS
// reads via --paper. `tack` is the thumbtack color. `label` is the swatch
// label in the per-widget settings popover.
// Pre-v0.4.20 theme keys (glass/rose/teal/amber/noir) are aliased below to
// the closest sticky color so saved settings keep working after upgrade.
export const WIDGET_THEMES = {
  manila:    { paper: 'var(--sticky-manila)',   tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Manila' },
  mint:      { paper: 'var(--sticky-mint)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Mint' },
  pink:      { paper: 'var(--sticky-pink)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Pink' },
  lavender:  { paper: 'var(--sticky-lavender)', tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Lavender' },
  aged:      { paper: 'var(--sticky-aged)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Aged' },
  blue:      { paper: 'var(--sticky-blue)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Blue' },
  // Aliases so old persisted theme values still resolve. Pre-existing
  // “glass” users get manila, “rose” → pink, “teal” → mint, etc.
  glass:     { paper: 'var(--sticky-aged)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Aged' },
  rose:      { paper: 'var(--sticky-pink)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Pink' },
  teal:      { paper: 'var(--sticky-mint)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Mint' },
  amber:     { paper: 'var(--sticky-manila)',   tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Manila' },
  noir:      { paper: 'var(--sticky-aged)',     tack: 'var(--chalk-red)',    ink: 'var(--sticky-ink)', label: 'Aged' },
};

// User-pickable swatches in the settings popover. Aliases hidden — they
// only exist for backward-compat resolution.
export const STICKY_SWATCHES = ['manila', 'mint', 'pink', 'lavender', 'aged', 'blue'];

// Layout is a per-breakpoint object: { lg: [...], md: [...], sm: [...] }.
//
// v0.4.8: derive md/sm from lg *proportionally* instead of letting RGL
// auto-stack everything when the user shrinks the window. The user's spatial
// intent ("todo top-right, prompt top-left") carries across breakpoints by
// scaling x/w by the column ratio. Customisations at md/sm are tracked
// independently so a later lg edit doesn't blow them away.

// Scale a single layout entry from the lg (12-col) grid to a target column
// count, preserving relative position and width. Heights are unchanged because
// row height is constant across breakpoints.
function scaleLayoutEntry(entry, targetCols) {
  const ratio = targetCols / BREAKPOINT_COLS.lg;
  const minW = entry.minW != null ? Math.max(1, Math.min(targetCols, Math.round(entry.minW * ratio))) : undefined;
  const w = Math.max(minW || 1, Math.min(targetCols, Math.round(entry.w * ratio)));
  // Clamp x so x+w never overflows the target grid; RGL will repack y.
  const x = Math.max(0, Math.min(targetCols - w, Math.round(entry.x * ratio)));
  const out = { ...entry, x, w };
  if (minW != null) out.minW = minW;
  return out;
}

export function deriveLayoutFromLg(lgLayout, breakpoint) {
  const cols = BREAKPOINT_COLS[breakpoint];
  if (!cols || breakpoint === 'lg') return (lgLayout || []).map(l => ({ ...l }));
  return (lgLayout || []).map(entry => scaleLayoutEntry(entry, cols));
}

function defaultLayouts() {
  // Seed lg from DEFAULT_LAYOUT, then derive md/sm proportionally so the
  // first windowed render matches the maximised spatial intent instead of
  // RGL's auto-stack.
  const lg = DEFAULT_LAYOUT.map(l => ({ ...l }));
  return {
    lg,
    md: deriveLayoutFromLg(lg, 'md'),
    sm: deriveLayoutFromLg(lg, 'sm'),
  };
}

function loadCustomizedFlags() {
  try {
    const raw = localStorage.getItem(CUSTOMIZED_KEY);
    if (!raw) return { lg: false, md: false, sm: false };
    const parsed = JSON.parse(raw);
    return {
      lg: !!(parsed && parsed.lg),
      md: !!(parsed && parsed.md),
      sm: !!(parsed && parsed.sm),
    };
  } catch {
    return { lg: false, md: false, sm: false };
  }
}

export function saveCustomizedFlags(flags) {
  try { localStorage.setItem(CUSTOMIZED_KEY, JSON.stringify(flags)); } catch { /* ignore */ }
}

export function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultLayouts();
    const parsed = JSON.parse(raw);
    const customized = loadCustomizedFlags();

    // Legacy: a flat array means it was saved by the old single-breakpoint
    // code path. Treat it as the lg layout, derive md/sm from it.
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return defaultLayouts();
      const lg = parsed;
      return {
        lg,
        md: deriveLayoutFromLg(lg, 'md'),
        sm: deriveLayoutFromLg(lg, 'sm'),
      };
    }
    if (parsed && typeof parsed === 'object') {
      const lg = Array.isArray(parsed.lg) && parsed.lg.length > 0
        ? parsed.lg
        : DEFAULT_LAYOUT.map(l => ({ ...l }));
      // For md/sm: only honour the saved layout if the user has customised
      // at that breakpoint. Otherwise re-derive from lg so a later lg edit
      // propagates into windowed mode automatically.
      const md = customized.md && Array.isArray(parsed.md) && parsed.md.length > 0
        ? parsed.md
        : deriveLayoutFromLg(lg, 'md');
      const sm = customized.sm && Array.isArray(parsed.sm) && parsed.sm.length > 0
        ? parsed.sm
        : deriveLayoutFromLg(lg, 'sm');
      return { lg, md, sm };
    }
    return defaultLayouts();
  } catch {
    return defaultLayouts();
  }
}

export function saveLayout(layouts) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layouts)); } catch { /* ignore */ }
}

export function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_KEY);
    localStorage.removeItem(CUSTOMIZED_KEY);
  } catch { /* ignore */ }
}

export { loadCustomizedFlags };

export function loadWidgetState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_WIDGET_STATE));
    const parsed = JSON.parse(raw);
    return { ...JSON.parse(JSON.stringify(DEFAULT_WIDGET_STATE)), ...parsed };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_WIDGET_STATE));
  }
}

export function saveWidgetState(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ---- Per-widget data stores (kept out of the layout/state blobs) ----

const TODO_KEY = 'quillosofi:quillounge:todo';
export function loadTodos() {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveTodos(todos) {
  try { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); } catch { /* ignore */ }
}

// Today's prompt + fun fact: rotated daily, seeded from a small static pool.
// Storing the date alongside lets us cache today's pick so it doesn't change
// during the day.
const PROMPTS = [
  'Write a single sentence that contradicts itself but feels true.',
  'Describe a place you\'ve never been to as if you grew up there.',
  'What does your character carry in their pockets — and why?',
  'Open with a line of dialogue. End with the same line. Write the middle.',
  'Pick a word you love. Now write a paragraph without using it.',
  'A character finds a letter addressed to someone with their name.',
  'Describe a smell that doesn\'t exist yet.',
  'Write the opening of a story that begins after the climax.',
  'Two strangers share a small lie. Then a real one.',
  'A house remembers. What does it choose to forget?',
];
const FUN_FACTS = [
  'Octopuses have three hearts and blue blood.',
  'There are more trees on Earth than stars in the Milky Way.',
  'The shortest war in history lasted 38 minutes.',
  'Honey never spoils. 3,000-year-old honey is still edible.',
  'A group of flamingos is called a "flamboyance".',
  'Bananas are berries. Strawberries are not.',
  'Sloths can hold their breath for 40 minutes underwater.',
  'The Eiffel Tower can grow up to 6 inches taller in summer.',
  'Sharks predate trees on Earth by ~50 million years.',
  'A jiffy is an actual unit of time — about 1/60th of a second.',
];
export function getTodaysPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  return {
    prompt: PROMPTS[seed % PROMPTS.length],
    fact: FUN_FACTS[(seed + 3) % FUN_FACTS.length],
    date: today,
  };
}
