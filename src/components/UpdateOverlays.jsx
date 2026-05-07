/*
 * v0.4.51 + v0.5.2 — Update overlays: startup splash, pending-install
 * countdown, and in-session auto-update progress card.
 *
 * Three independent surfaces, all mounted at App root:
 *
 *   1. <SplashScreen /> — a brief chalkboard fade-in with the Quillosofi
 *      wordmark + spinner that plays for ~1.6s on every launch.
 *
 *   2. <PendingInstallCountdown /> — listens for `updates:pending-install`
 *      (fired 3s after launch when a download was staged last session AND
 *      auto-install is on). Hard 10s countdown modal, no cancel.
 *
 *   3. <AutoUpdateProgressCard /> — v0.5.2. Pre-v0.5.2 the auto-install path
 *      silently called downloadUpdate() in the background and the user only
 *      saw it if they happened to be on the Update settings tab. Now we surface
 *      a non-blocking bottom-right card that walks through detected →
 *      downloading → ready-to-install, with a real progress bar and an
 *      "Install now" button at the end so the user can land it without waiting
 *      for next launch.
 *
 * All three are no-ops when window.quillosofi isn't present (web/dev outside
 * electron). The splash still plays on web for vibes.
 */
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Sparkles, Download, Check, X, ExternalLink } from 'lucide-react';

// =============================================================
// SplashScreen — ~1.6s chalkboard fade-in on launch.
// =============================================================
function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Hold for 1.4s, fade for 200ms, then unmount entirely.
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const unmountTimer = setTimeout(() => setVisible(false), 1600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[hsl(135,28%,12%)] transition-opacity duration-200 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        // Chalkboard: subtle textured radial so it doesn't feel like a flat hex.
        backgroundImage:
          'radial-gradient(circle at 50% 40%, hsla(135, 26%, 18%, 0.7) 0%, hsla(135, 30%, 9%, 1) 80%)',
      }}
      role="status"
      aria-label="Quillosofi loading"
    >
      {/* Wordmark — uses Oldenburg via the global font stack. */}
      <div className="flex flex-col items-center gap-2 select-none">
        <h1
          className="text-5xl font-normal tracking-tight"
          style={{
            fontFamily: '"Oldenburg", serif',
            color: 'hsl(48, 86%, 70%)',
            textShadow: '0 2px 12px hsla(48, 86%, 50%, 0.25)',
          }}
        >
          Quillosofi
        </h1>
        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: 'hsl(135, 18%, 55%)' }}
        >
          A Pure Writing Studio
        </p>
      </div>
      <Loader2
        className="h-5 w-5 animate-spin"
        style={{ color: 'hsl(48, 86%, 60%)' }}
      />
    </div>
  );
}

// =============================================================
// PendingInstallCountdown — hard 10s, no escape.
// =============================================================
function PendingInstallCountdown() {
  const [pending, setPending] = useState(null); // { version }
  const [seconds, setSeconds] = useState(10);

  // Subscribe to the main-process bridge.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bridge = window.quillosofi?.updates;
    if (!bridge?.onPendingInstall) return;
    const unsub = bridge.onPendingInstall((payload) => {
      setPending(payload || { version: '?' });
      setSeconds(10);
    });
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, []);

  // Tick the countdown when active.
  useEffect(() => {
    if (!pending) return;
    if (seconds <= 0) {
      // Fire install. No-op if updater isn't there, but in the real flow
      // main has already verified the staged installer exists.
      try { window.quillosofi?.updates?.install?.(); } catch (_) {}
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [pending, seconds]);

  if (!pending) return null;

  const pct = Math.max(0, Math.min(100, ((10 - seconds) / 10) * 100));

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pending-install-title"
    >
      <div
        className="w-[420px] max-w-[92vw] rounded-2xl border border-primary/30 bg-card shadow-2xl p-6 space-y-4"
        style={{ animation: 'pendingInstallPop 220ms ease-out' }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <h2
            id="pending-install-title"
            className="text-base font-semibold text-foreground"
          >
            Installing v{pending.version}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground leading-snug">
          A new version was downloaded last session. Quillosofi will restart
          and install it in <span className="font-mono text-primary">{seconds}s</span>.
        </p>

        {/* Big punchy countdown number */}
        <div className="flex items-center justify-center py-2">
          <span
            className="font-mono font-semibold text-primary tabular-nums"
            style={{ fontSize: '4rem', lineHeight: 1 }}
            aria-live="polite"
          >
            {seconds}
          </span>
        </div>

        {/* Progress bar fills as countdown depletes */}
        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-[11px] text-muted-foreground/80 text-center">
          The app will close, install the update, and reopen automatically.
        </p>
      </div>

      {/* Pop-in keyframes inline so we don't have to touch the global tailwind config. */}
      <style>{`
        @keyframes pendingInstallPop {
          0%   { transform: scale(0.92); opacity: 0; }
          60%  { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// =============================================================
// AutoUpdateProgressCard — v0.5.2.
//
// Bottom-right corner card that walks through the auto-install flow with the
// user actually able to see it. Subscribes to `updates:state` from main and
// renders three phases:
//
//   - 'available'   : detected, kicking off download (indeterminate shimmer)
//   - 'downloading' : real percent bar from main's download-progress events
//   - 'downloaded'  : Install Now / Later buttons (Later just dismisses;
//                     the existing pending-install countdown still fires on
//                     next launch since main persisted the marker).
//
// Visibility rules:
//   - Only shows when `settings.autoInstall === true` (manual checks already
//     have the Update settings tab the user navigated to).
//   - Dismissable mid-download with the × — user can re-open the Update tab
//     in Settings if they want details.
//   - Re-appears for each new release detected in the same session.
//   - No-op outside electron (no bridge → no events).
// =============================================================
function AutoUpdateProgressCard() {
  // The full state payload from main's emitUpdateState().
  // { status, currentVersion, latestVersion, releaseNotes, downloadPercent, settings, ... }
  const [state, setState] = useState(null);
  // Per-version dismissal — if the user closes the card for v0.5.3, we don't
  // pop it back open every time `updates:state` ticks. Reset when a *new*
  // version comes in.
  const [dismissedVersion, setDismissedVersion] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bridge = window.quillosofi?.updates;
    if (!bridge?.onState) return;
    const unsub = bridge.onState((payload) => {
      setState(payload || null);
    });
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, []);

  const handleInstallNow = useCallback(() => {
    try { window.quillosofi?.updates?.install?.(); } catch (_) {}
  }, []);

  const handleOpenReleasePage = useCallback(() => {
    try { window.quillosofi?.updates?.openReleasePage?.(); } catch (_) {}
  }, []);

  const handleDismiss = useCallback(() => {
    if (state?.latestVersion) setDismissedVersion(state.latestVersion);
  }, [state?.latestVersion]);

  if (!state) return null;
  const { status, latestVersion, downloadPercent = 0, releaseNotes, settings } = state;

  // Auto-install must be on — manual flows already have the settings tab.
  if (!settings?.autoInstall) return null;

  // Only relevant statuses surface here.
  const isRelevant = status === 'available' || status === 'downloading' || status === 'downloaded';
  if (!isRelevant) return null;

  // Honour per-version dismissal.
  if (latestVersion && dismissedVersion === latestVersion) return null;

  // Tagline — first non-empty line of release notes if available.
  const tagline = (() => {
    if (typeof releaseNotes === 'string' && releaseNotes.trim()) {
      const firstLine = releaseNotes.split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (firstLine && firstLine.length < 140) return firstLine;
    }
    if (status === 'available') return 'Detected a new release — starting download…';
    if (status === 'downloading') return 'Downloading in the background. You can keep writing.';
    if (status === 'downloaded') return 'Downloaded and ready. Restart now or on next launch.';
    return null;
  })();

  const versionLabel = latestVersion ? `v${latestVersion}` : 'a new release';

  return (
    <div
      className="fixed bottom-4 right-4 z-[9997] w-[360px] max-w-[92vw]"
      role="status"
      aria-live="polite"
      aria-label={`Auto-update progress for ${versionLabel}`}
      style={{ animation: 'autoUpdateCardPop 220ms ease-out' }}
    >
      <div className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2">
          <div className="shrink-0 mt-0.5">
            {status === 'downloaded' ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {status === 'downloaded'
                ? `Quillosofi ${versionLabel} ready to install`
                : `Quillosofi ${versionLabel} ${status === 'available' ? 'available' : 'downloading…'}`}
            </h3>
            {tagline && (
              <p className="text-[11.5px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                {tagline}
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress / status track */}
        <div className="px-4 pb-3">
          {status === 'available' && (
            // Indeterminate shimmer until the first download-progress tick.
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden relative">
              <div
                className="absolute inset-y-0 w-1/3 rounded-full bg-primary/70"
                style={{ animation: 'autoUpdateShimmer 1.4s ease-in-out infinite' }}
              />
            </div>
          )}
          {status === 'downloading' && (
            <>
              <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-200 ease-linear"
                  style={{ width: `${Math.max(2, Math.min(100, downloadPercent))}%` }}
                />
              </div>
              <p className="text-[10.5px] font-mono text-muted-foreground mt-1.5 tabular-nums">
                {Math.round(downloadPercent)}%
              </p>
            </>
          )}
          {status === 'downloaded' && (
            <div className="h-1.5 w-full rounded-full bg-primary/80" aria-hidden />
          )}
        </div>

        {/* Footer actions — only after download finishes */}
        {status === 'downloaded' && (
          <div className="px-3 pb-3 pt-1 flex items-center gap-2">
            <button
              onClick={handleInstallNow}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Install now
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 text-[12.5px] transition-colors"
              title="Install on next launch instead"
            >
              Later
            </button>
            <button
              onClick={handleOpenReleasePage}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              aria-label="View release notes"
              title="View release notes"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes autoUpdateCardPop {
          0%   { transform: translateY(8px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes autoUpdateShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

// =============================================================
// Combined wrapper — mount once at App root.
// =============================================================
export default function UpdateOverlays() {
  return (
    <>
      <SplashScreen />
      <PendingInstallCountdown />
      <AutoUpdateProgressCard />
    </>
  );
}
