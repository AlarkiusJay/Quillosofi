// canvasBus.js — v0.6.65-Alpha2
//
// Tri-hub sync ring (Alaria's spec, Alpha 2 of v0.6 cycle):
//   Quillounge ↔ Quillscript ↔ Quillibrary all read from the same Canvas
//   store. When ANY of them mutates a canvas (rename, pin, favorite, emoji,
//   cover, reorder, create, delete), the other two refresh live.
//
// Implementation:
//   • In-process CustomEvent on `window` for same-tab sync (zero latency,
//     no React tree gymnastics).
//   • localStorage `storage` event for cross-tab sync — when the user has
//     Quillounge in one window and Quillscript in another, edits propagate.
//
// Each consumer subscribes via `subscribeCanvasBus(handler)` and gets back
// an unsubscribe fn. The handler receives a normalized event:
//   { kind: 'created' | 'updated' | 'deleted', id, patch?, canvas? }
//
// Mutators call `emitCanvasChange(kind, payload)` immediately after a
// successful `app.entities.Canvas.{create,update,delete}` call. The bus
// is intentionally fire-and-forget — handlers must be defensive (e.g.
// debounce reloads, ignore unknown ids).

const EVENT = 'quillosofi:canvas:bus';
const STORAGE_KEY = 'quillosofi:canvas:bus:tick';

export function emitCanvasChange(kind, payload = {}) {
  const detail = { kind, ...payload, ts: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail }));
  } catch { /* SSR / non-browser */ }
  // Bump a localStorage key to wake cross-tab listeners. We write the
  // serialized event so other tabs can rehydrate the same detail.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
  } catch { /* quota / disabled */ }
}

export function subscribeCanvasBus(handler) {
  if (typeof handler !== 'function') return () => {};
  const onLocal = (e) => {
    try { handler(e.detail || {}); } catch { /* swallow */ }
  };
  const onStorage = (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const detail = JSON.parse(e.newValue);
      handler(detail || {});
    } catch { /* malformed payload — ignore */ }
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}
