/*
 * AI on/off state for Quillosofi v0.4.
 *
 * Per the v0.4 spec ("Writing First"): the writing app stops orbiting the AI.
 * AI is OFF by default on a fresh install, fully togglable, with each
 * AI-powered surface (highlight popup, dictionary AI extension, research,
 * chat, @ mentions) able to flip independently while still being gated by
 * the global toggle.
 *
 * Storage is plain localStorage so we don't depend on Base44.
 */

import { useEffect, useState, useCallback } from 'react';

// Stored as 'true' / 'false' strings; missing key === OFF (the v0.4 default).
const AI_KEY = 'quillosofi:aiEnabled';
const AI_RETENTION_KEY = 'quillosofi:aiDataRetention'; // also default OFF per spec

// Per-extension toggles. All default ON when AI is on (so flipping AI on
// gives the full experience), but each can be muted individually.
const EXTENSION_DEFAULTS = {
  customDictionary: true,
  highlightPopup: true,
  research: true,
  chat: true,
  mentions: false, // v0.5 phase 2 — listed here so the UI can show it greyed
};
const EXTENSIONS_KEY = 'quillosofi:aiExtensions';

function readBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function writeBool(key, value) {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    /* ignore quota / private mode */
  }
}

export function getAiEnabled() {
  return readBool(AI_KEY, false); // OFF by default
}

export function setAiEnabled(value) {
  writeBool(AI_KEY, value);
  window.dispatchEvent(new CustomEvent('quillosofi:ai-changed', { detail: { enabled: !!value } }));
}

export function getAiRetention() {
  return readBool(AI_RETENTION_KEY, false); // OFF by default per spec
}

export function setAiRetention(value) {
  writeBool(AI_RETENTION_KEY, value);
  window.dispatchEvent(new CustomEvent('quillosofi:ai-retention-changed', { detail: { enabled: !!value } }));
}

export function getAiExtensions() {
  try {
    const raw = localStorage.getItem(EXTENSIONS_KEY);
    if (!raw) return { ...EXTENSION_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...EXTENSION_DEFAULTS, ...parsed };
  } catch {
    return { ...EXTENSION_DEFAULTS };
  }
}

export function setAiExtension(key, value) {
  const current = getAiExtensions();
  const next = { ...current, [key]: !!value };
  try {
    localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('quillosofi:ai-extensions-changed', { detail: next }));
  return next;
}

/**
 * React hook — returns [enabled, setEnabled] and stays in sync across
 * components / tabs.
 */
export function useAiEnabled() {
  const [enabled, setEnabledState] = useState(getAiEnabled);

  useEffect(() => {
    const onChange = (e) => setEnabledState(!!e.detail?.enabled);
    const onStorage = (e) => {
      if (e.key === AI_KEY) setEnabledState(e.newValue === 'true');
    };
    window.addEventListener('quillosofi:ai-changed', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('quillosofi:ai-changed', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setter = useCallback((next) => {
    const value = typeof next === 'function' ? next(getAiEnabled()) : next;
    setAiEnabled(!!value);
  }, []);

  return [enabled, setter];
}

export function useAiRetention() {
  const [retention, setRetentionState] = useState(getAiRetention);

  useEffect(() => {
    const onChange = (e) => setRetentionState(!!e.detail?.enabled);
    window.addEventListener('quillosofi:ai-retention-changed', onChange);
    return () => window.removeEventListener('quillosofi:ai-retention-changed', onChange);
  }, []);

  const setter = useCallback((next) => {
    const value = typeof next === 'function' ? next(getAiRetention()) : next;
    setAiRetention(!!value);
  }, []);

  return [retention, setter];
}

export function useAiExtensions() {
  const [exts, setExts] = useState(getAiExtensions);
  useEffect(() => {
    const onChange = (e) => setExts(e.detail || getAiExtensions());
    window.addEventListener('quillosofi:ai-extensions-changed', onChange);
    return () => window.removeEventListener('quillosofi:ai-extensions-changed', onChange);
  }, []);
  return [exts, setAiExtension];
}

/**
 * Helper: is a specific AI extension currently effective?
 * (i.e. global AI on AND that extension's per-toggle on)
 */
export function isExtensionActive(extKey) {
  if (!getAiEnabled()) return false;
  const exts = getAiExtensions();
  return !!exts[extKey];
}
