// Editor tabs persistence — multi-document tabs for Canvas/Sheets hubs.
//
// Storage shape (per kind):
//   quillosofi:<kind>:openTabs  → string[] of doc IDs, oldest→newest
//   quillosofi:<kind>:lastOpen  → string|null  (last focused tab)
//
// Tabs survive across launches so the user can resume where they left off.
// Stale IDs (deleted docs) are pruned on read.
import { useEffect, useState, useCallback } from 'react';

const MAX_TABS = 12;

const tabsKey = (kind) => `quillosofi:${kind}:openTabs`;
const lastKey = (kind) => `quillosofi:${kind}:lastOpen`;

function readArr(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readStr(key) {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function getOpenTabs(kind) { return readArr(tabsKey(kind)); }
export function getLastOpen(kind) { return readStr(lastKey(kind)); }

export function saveOpenTabs(kind, ids) {
  try {
    const trimmed = (ids || []).slice(-MAX_TABS);
    localStorage.setItem(tabsKey(kind), JSON.stringify(trimmed));
  } catch { /* ignore quota */ }
}

export function saveLastOpen(kind, id) {
  try {
    if (id) localStorage.setItem(lastKey(kind), id);
    else localStorage.removeItem(lastKey(kind));
  } catch { /* ignore quota */ }
}

// React hook — kind is 'canvas' or 'sheets'.
export function useEditorTabs(kind) {
  const [tabs, setTabs] = useState(() => getOpenTabs(kind));
  const [activeId, setActiveId] = useState(() => getLastOpen(kind));

  // Keep storage in sync.
  useEffect(() => { saveOpenTabs(kind, tabs); }, [kind, tabs]);
  useEffect(() => { saveLastOpen(kind, activeId); }, [kind, activeId]);

  const openTab = useCallback((id) => {
    if (!id) return;
    setTabs(prev => prev.includes(id) ? prev : [...prev, id].slice(-MAX_TABS));
    setActiveId(id);
  }, []);

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      const next = prev.filter(t => t !== id);
      // If we closed the active one, fall back to neighbour.
      setActiveId(curr => {
        if (curr !== id) return curr;
        const idx = prev.indexOf(id);
        return next[idx] || next[idx - 1] || null;
      });
      return next;
    });
  }, []);

  // Drop tabs whose IDs no longer exist in `validIds`. Useful after listing.
  const pruneTabs = useCallback((validIds) => {
    const valid = new Set(validIds);
    setTabs(prev => {
      const next = prev.filter(id => valid.has(id));
      if (next.length !== prev.length) {
        setActiveId(curr => (curr && valid.has(curr)) ? curr : (next[next.length - 1] || null));
      }
      return next;
    });
  }, []);

  return { tabs, activeId, openTab, closeTab, setActiveId, pruneTabs };
}
