/*
 * Client-side spellcheck for Quillosofi v0.4 (typo-js based).
 *
 * Loads a Hunspell English dictionary lazily from the public/ directory,
 * then exposes simple `check(word)` and `suggest(word)` helpers. Words in
 * the user's custom dictionary always pass.
 *
 * This is intentionally tiny — v0.4 only flags single-word typos. Multi-word
 * phrase detection is deferred to v0.5 per spec.
 */

import Typo from 'typo-js';
import { isCustomWord } from './customDict';

let typoInstance = null;
let loadPromise = null;

async function loadDict() {
  if (typoInstance) return typoInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const [aff, dic] = await Promise.all([
        fetch('/dictionaries/en_US.aff').then(r => r.ok ? r.text() : null),
        fetch('/dictionaries/en_US.dic').then(r => r.ok ? r.text() : null),
      ]);
      if (!aff || !dic) {
        console.warn('[spellcheck] dictionary files missing — disabling');
        return null;
      }
      typoInstance = new Typo('en_US', aff, dic, { platform: 'any' });
      return typoInstance;
    } catch (e) {
      console.warn('[spellcheck] failed to load:', e);
      return null;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Kick off dict loading early so the first check is snappy. */
export function preloadSpellcheck() {
  loadDict();
}

const SKIP_RE = /^[\d\W_]+$/; // numbers / punctuation only — never flag

export async function checkWord(word) {
  if (!word || word.length < 2) return true;
  if (SKIP_RE.test(word)) return true;
  if (isCustomWord(word)) return true;
  const dict = await loadDict();
  if (!dict) return true; // dict not available — be permissive
  return dict.check(word);
}

export function checkWordSync(word) {
  if (!word || word.length < 2) return true;
  if (SKIP_RE.test(word)) return true;
  if (isCustomWord(word)) return true;
  if (!typoInstance) return true; // not yet loaded
  return typoInstance.check(word);
}

export async function suggest(word, max = 5) {
  if (!word) return [];
  const dict = await loadDict();
  if (!dict) return [];
  try {
    return dict.suggest(word, max) || [];
  } catch {
    return [];
  }
}

export function suggestSync(word, max = 5) {
  if (!typoInstance) return [];
  try {
    return typoInstance.suggest(word, max) || [];
  } catch {
    return [];
  }
}

/**
 * Tokenize a string into [{ word, start, end }] segments,
 * splitting on whitespace and most punctuation but keeping apostrophes
 * inside words (so "don't" stays one token).
 */
export function tokenize(text) {
  const tokens = [];
  if (!text) return tokens;
  const re = /[A-Za-z][A-Za-z']*/g;
  let m;
  while ((m = re.exec(text))) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}
