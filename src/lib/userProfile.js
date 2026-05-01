/*
 * Local user profile (Quillounge greeting + display name).
 * Independent of Base44 so the home page works offline / pre-auth.
 */

import { useEffect, useState, useCallback } from 'react';

const NAME_KEY = 'quillosofi:userName';

export function getUserName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setUserName(name) {
  try {
    if (name && name.trim()) {
      localStorage.setItem(NAME_KEY, name.trim());
    } else {
      localStorage.removeItem(NAME_KEY);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('quillosofi:user-name-changed', { detail: { name: name?.trim() || '' } }));
}

export function useUserName() {
  const [name, setNameState] = useState(getUserName);
  useEffect(() => {
    const onChange = (e) => setNameState(e.detail?.name || '');
    window.addEventListener('quillosofi:user-name-changed', onChange);
    return () => window.removeEventListener('quillosofi:user-name-changed', onChange);
  }, []);
  const setter = useCallback((next) => setUserName(next), []);
  return [name, setter];
}

/**
 * Time-aware greeting:
 *  - 5-11    "Good morning"
 *  - 12-16   "Good afternoon"
 *  - 17-20   "Good evening"
 *  - 21-04   "Still up"
 */
export function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return { greeting: 'Good morning', period: 'morning' };
  if (h >= 12 && h < 17) return { greeting: 'Good afternoon', period: 'afternoon' };
  if (h >= 17 && h < 21) return { greeting: 'Good evening', period: 'evening' };
  return { greeting: 'Still up', period: 'night' };
}
