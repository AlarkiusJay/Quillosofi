/*
 * Configurable keybinds for Quillosofi v0.4.
 *
 * Defaults (per the v0.4 spec):
 *   addToDictionary    Ctrl+Alt+D    — add highlighted word to custom dict
 *   toggleAiDictionary Ctrl+Shift+D  — pin/unpin highlighted word as AI context
 *   openSettings       Ctrl+,        — open Settings modal
 *   openAiSettings     Ctrl+;        — open AI Settings modal
 *
 * Each binding is stored as { key, ctrl, shift, alt, meta }. The user can
 * remap them in Settings → Keybinds. A key of '' / null disables the binding.
 */

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'quillosofi:keybinds';

export const DEFAULT_KEYBINDS = {
  addToDictionary:    { key: 'd', ctrl: true,  shift: false, alt: true,  meta: false },
  toggleAiDictionary: { key: 'd', ctrl: true,  shift: true,  alt: false, meta: false },
  openSettings:       { key: ',', ctrl: true,  shift: false, alt: false, meta: false },
  openAiSettings:     { key: ';', ctrl: true,  shift: false, alt: false, meta: false },
};

export const KEYBIND_LABELS = {
  addToDictionary:    'Add highlighted word to dictionary',
  toggleAiDictionary: 'Toggle highlighted word in AI context',
  openSettings:       'Open Settings',
  openAiSettings:     'Open AI Settings',
};

export function getKeybinds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw);
    // Merge in any new defaults that the user's stored copy doesn't have.
    return { ...DEFAULT_KEYBINDS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function setKeybind(action, binding) {
  const current = getKeybinds();
  const next = { ...current, [action]: binding };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('quillosofi:keybinds-changed', { detail: next }));
  return next;
}

export function resetKeybinds() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('quillosofi:keybinds-changed', { detail: { ...DEFAULT_KEYBINDS } }));
}

export function formatBinding(binding) {
  if (!binding || !binding.key) return '— unset —';
  const parts = [];
  if (binding.ctrl) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  if (binding.meta) parts.push('Cmd');
  // Display key uppercased for letters, raw for symbols
  parts.push(binding.key.length === 1 ? binding.key.toUpperCase() : binding.key);
  return parts.join('+');
}

export function matchesBinding(event, binding) {
  if (!binding || !binding.key) return false;
  const k = (event.key || '').toLowerCase();
  if (k !== binding.key.toLowerCase()) return false;
  if (!!event.ctrlKey !== !!binding.ctrl) return false;
  if (!!event.shiftKey !== !!binding.shift) return false;
  if (!!event.altKey !== !!binding.alt) return false;
  if (!!event.metaKey !== !!binding.meta) return false;
  return true;
}

export function bindingFromEvent(event) {
  // Ignore plain modifier presses
  const k = event.key;
  if (!k || ['Control', 'Shift', 'Alt', 'Meta'].includes(k)) return null;
  return {
    key: k.length === 1 ? k.toLowerCase() : k,
    ctrl: !!event.ctrlKey,
    shift: !!event.shiftKey,
    alt: !!event.altKey,
    meta: !!event.metaKey,
  };
}

export function useKeybinds() {
  const [binds, setBinds] = useState(getKeybinds);
  useEffect(() => {
    const onChange = (e) => setBinds(e.detail || getKeybinds());
    window.addEventListener('quillosofi:keybinds-changed', onChange);
    return () => window.removeEventListener('quillosofi:keybinds-changed', onChange);
  }, []);
  return [binds, setKeybind, resetKeybinds];
}

/**
 * Hook — wires a global keydown listener that fires `handlers[action]` when
 * the matching binding is pressed. Updates automatically when the user
 * remaps a key.
 */
export function useGlobalKeybinds(handlers) {
  const [binds] = useKeybinds();
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't fire when typing in plain inputs unless the binding has a modifier
      // (we WANT Ctrl+, etc to work even inside textareas).
      for (const action of Object.keys(handlers)) {
        const binding = binds[action];
        if (!binding) continue;
        if (matchesBinding(e, binding)) {
          // Allow typing Ctrl+letter in inputs only when our binding has a modifier
          const hasModifier = binding.ctrl || binding.alt || binding.meta;
          if (!hasModifier) {
            const target = e.target;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) continue;
          }
          e.preventDefault();
          try { handlers[action]?.(e); } catch (err) { console.error(err); }
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [binds, handlers]);
}
