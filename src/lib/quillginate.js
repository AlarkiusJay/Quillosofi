// quillginate.js — v0.6.10-Alpha1
//
// Per-canvas toggle for Quillginate (the paginated/layout-review mode).
//
// Architecture rule (locked in by Alaria, v0.6 cycle):
//   "When Quillginate is off, sync between Quillginate to Quillibrary and
//    Quillscript is cut OFF. Sync between Quillibrary and Quillscript is
//    its own sync thing, not part of Quillginate unless activated."
//
// So Quillginate is opt-in compute:
//   • OFF (default)  → no paginator mounted, no overflow controller,
//                       no per-page editor instances. Pure Quillscript.
//   • ON             → TiptapPagedEditor mounts, pagination runs, the
//                       editor surface re-uses the v0.5.82 page-frame
//                       chrome (visually identical, by spec).
//
// State is persisted per-canvas in localStorage so toggling stays
// remembered across launches. The default is OFF for every canvas,
// including legacy v0.5.x canvases — those used to land in paginated
// mode by default, but Alpha 1 of v0.6 explicitly silences the
// paginator unless the user opts back in.

const KEY = 'quillosofi:quillginate:v1';

function readMap() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota / storage disabled — fail silently */
  }
}

export function isQuillginateActive(canvasId) {
  if (!canvasId) return false;
  const map = readMap();
  return !!map[canvasId];
}

export function setQuillginateActive(canvasId, active) {
  if (!canvasId) return;
  const map = readMap();
  if (active) map[canvasId] = true;
  else delete map[canvasId];
  writeMap(map);
}
