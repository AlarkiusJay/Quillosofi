import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'quillosofi:lastSeenVersion'

/**
 * Returns { freshlyUpdated, fromVersion, toVersion, dismiss } where:
 * - freshlyUpdated is true if the app was restarted with a new version since the user last opened the Update tab.
 * - fromVersion is the previously-installed version (so a toast can say "v0.4.38 → v0.4.40").
 * - toVersion is the current build's version.
 * - dismiss() clears the freshly-updated flag (call when user dismisses the toast or opens the Update tab).
 *
 * Logic:
 *  - On first ever launch (no stored value): persist current, do NOT flag (avoid false-positive on fresh installs).
 *  - On subsequent launches: if stored !== current → flag freshly; persist current immediately.
 *  - dismiss() just sets the in-memory flag to false; storage is already up-to-date.
 */
export default function useFreshlyUpdated() {
  const [freshlyUpdated, setFreshlyUpdated] = useState(false)
  const [fromVersion, setFromVersion] = useState(null)
  const [toVersion, setToVersion] = useState(null)

  useEffect(() => {
    try {
      // __APP_VERSION__ is injected at build time by vite.config.js define.
      // eslint-disable-next-line no-undef
      const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null
      if (!current) return
      setToVersion(current)
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && stored !== current) {
        setFromVersion(stored)
        setFreshlyUpdated(true)
      }
      // Always persist current so we only flag once per upgrade.
      localStorage.setItem(STORAGE_KEY, current)
    } catch {
      // localStorage unavailable — silently ignore.
    }
  }, [])

  const dismiss = useCallback(() => {
    setFreshlyUpdated(false)
  }, [])

  return { freshlyUpdated, fromVersion, toVersion, dismiss }
}
