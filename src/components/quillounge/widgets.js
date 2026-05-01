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

// 12-column grid. Each entry: { i, x, y, w, h, minW, minH }.
export const DEFAULT_LAYOUT = [
  { i: 'greeting',     x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
  { i: 'todaysPrompt', x: 0, y: 2, w: 6,  h: 4, minW: 3, minH: 3 },
  { i: 'todo',         x: 6, y: 2, w: 6,  h: 6, minW: 3, minH: 3 },
  { i: 'pinnedRecent', x: 0, y: 6, w: 6,  h: 4, minW: 3, minH: 3 },
];

export const DEFAULT_WIDGET_STATE = {
  greeting:     { opacity: 1.00, theme: 'glass' },
  todaysPrompt: { opacity: 0.96, theme: 'rose' },
  todo:         { opacity: 0.96, theme: 'lavender' },
  pinnedRecent: { opacity: 0.96, theme: 'teal' },
};

// Theme palette — keyed by name, not raw color, so users can pick "rose"
// without seeing hex codes.
export const WIDGET_THEMES = {
  glass:     { bg: 'hsl(220, 8%, 16%)',  accent: 'hsl(235, 86%, 75%)', label: 'Glass' },
  lavender:  { bg: 'hsl(258, 30%, 18%)', accent: 'hsl(258, 80%, 70%)', label: 'Lavender' },
  rose:      { bg: 'hsl(340, 24%, 18%)', accent: 'hsl(340, 80%, 70%)', label: 'Rose' },
  teal:      { bg: 'hsl(176, 30%, 14%)', accent: 'hsl(176, 70%, 60%)', label: 'Teal' },
  amber:     { bg: 'hsl(38,  30%, 14%)', accent: 'hsl(38,  90%, 60%)', label: 'Amber' },
  noir:      { bg: 'hsl(220, 8%, 10%)',  accent: 'hsl(220, 14%, 75%)', label: 'Noir' },
};

// Layout is now a per-breakpoint object: { lg: [...], md: [...], sm: [...] }.
// We migrate the legacy flat-array shape into the new shape on read so users
// who saved layouts under v0.4.x don't lose their custom positions.
function defaultLayouts() {
  // Only seed lg from DEFAULT_LAYOUT — react-grid-layout will compute md/sm
  // from lg the first time those breakpoints are actually rendered, and we'll
  // capture them on the user's next interaction at that breakpoint.
  return { lg: DEFAULT_LAYOUT.map(l => ({ ...l })) };
}

export function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultLayouts();
    const parsed = JSON.parse(raw);
    // Legacy: a flat array means it was saved by the old single-breakpoint
    // code path. Treat it as the lg layout so users keep their positions.
    if (Array.isArray(parsed)) {
      return parsed.length === 0 ? defaultLayouts() : { lg: parsed };
    }
    if (parsed && typeof parsed === 'object') {
      // Sanity-filter — require at least one breakpoint with a non-empty array.
      const ok = ['lg', 'md', 'sm'].some(bp => Array.isArray(parsed[bp]) && parsed[bp].length > 0);
      return ok ? parsed : defaultLayouts();
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
  try { localStorage.removeItem(LAYOUT_KEY); } catch { /* ignore */ }
}

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
