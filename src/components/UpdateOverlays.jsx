/*
 * v0.4.51 + v0.5.2 + v0.5.3 — Update overlays: startup splash, pending-install
 * countdown, and in-session update progress card.
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
 *   3. <AutoUpdateProgressCard /> — v0.5.2 added it for the auto-install path.
 *      v0.5.3 extends it to the manual flow: when the user clicks Check for
 *      Updates or Download New Update in Settings, the card arms via the
 *      `quillosofi:update-card-arm` window event and surfaces the same
 *      detected → downloading → ready-to-install progression. When auto-install
 *      is OFF and the user hasn't clicked anything, the card stays silent.
 *
 * All three are no-ops when window.quillosofi isn't present (web/dev outside
 * electron). The splash still plays on web for vibes.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Sparkles, Download, Check, X, ExternalLink, Pause, Play } from 'lucide-react';

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
// AutoUpdateProgressCard — v0.5.2 + v0.5.3.
//
// Bottom-right corner card that walks through the update flow with the user
// actually able to see it. Subscribes to `updates:state` from main and renders
// three phases:
//
//   - 'available'   : detected. Auto mode shows shimmer (download already
//                     firing). Manual mode shows a Download button that calls
//                     updates.download() on click.
//   - 'downloading' : real percent bar from main's download-progress events
//   - 'downloaded'  : Install Now / Later buttons (Later just dismisses;
//                     the existing pending-install countdown still fires on
//                     next launch since main persisted the marker).
//
// Visibility rules (v0.5.3):
//   - Shows when `settings.autoInstall === true` (auto path), OR
//   - Shows when manually armed via the `quillosofi:update-card-arm` window
//     event (dispatched by AppUpdate.jsx when the user clicks Check for
//     Updates / Download New Update in Settings).
//   - When auto-install is OFF and the user hasn't clicked anything, the
//     card stays silent. No drive-by pop-ups.
//   - Dismissable mid-flow with the × — disarms manual mode and pins the
//     current version as dismissed so it doesn't pop back when state ticks.
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
  // v0.5.3: manual-arm flag. Flipped on by the `quillosofi:update-card-arm`
  // window event (fired from AppUpdate.jsx when the user clicks Check for
  // Updates / Download New Update). Cleared on dismiss.
  const [manuallyArmed, setManuallyArmed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bridge = window.quillosofi?.updates;
    if (!bridge?.onState) return;
    const unsub = bridge.onState((payload) => {
      setState(payload || null);
    });
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, []);

  // v0.5.3: listen for manual-arm events from the Settings → Update tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onArm = () => setManuallyArmed(true);
    window.addEventListener('quillosofi:update-card-arm', onArm);
    return () => window.removeEventListener('quillosofi:update-card-arm', onArm);
  }, []);

  const handleInstallNow = useCallback(() => {
    try { window.quillosofi?.updates?.install?.(); } catch (_) {}
  }, []);

  const handleManualDownload = useCallback(() => {
    try { window.quillosofi?.updates?.download?.(); } catch (_) {}
  }, []);

  const handleOpenReleasePage = useCallback(() => {
    try { window.quillosofi?.updates?.openReleasePage?.(); } catch (_) {}
  }, []);

  const handleDismiss = useCallback(() => {
    if (state?.latestVersion) setDismissedVersion(state.latestVersion);
    // Disarm manual mode so the card doesn't bounce back on the next state tick.
    setManuallyArmed(false);
  }, [state?.latestVersion]);

  if (!state) return null;
  const { status, latestVersion, downloadPercent = 0, releaseNotes, settings } = state;

  // v0.5.3: gate is auto-install ON, OR manually armed by a Settings click.
  const autoOn = !!settings?.autoInstall;
  if (!autoOn && !manuallyArmed) return null;

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
    if (status === 'available') {
      return autoOn
        ? 'Detected a new release — starting download…'
        : 'A new release is ready to download.';
    }
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
          {status === 'available' && autoOn && (
            // Auto path: shimmer while we wait for the first download-progress tick.
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden relative">
              <div
                className="absolute inset-y-0 w-1/3 rounded-full bg-primary/70"
                style={{ animation: 'autoUpdateShimmer 1.4s ease-in-out infinite' }}
              />
            </div>
          )}
          {status === 'available' && !autoOn && (
            // Manual path: idle bar — user hasn't started the download yet.
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden" aria-hidden />
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

        {/* v0.5.3: manual-mode footer — Download button on the available phase. */}
        {status === 'available' && !autoOn && (
          <div className="px-3 pb-3 pt-1 flex items-center gap-2">
            <button
              onClick={handleManualDownload}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 text-[12.5px] transition-colors"
              title="Dismiss"
            >
              Not now
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
// InstallReadyDialog — v0.6.95-alpha.8.
//
// Fires the moment electron-updater emits `update-downloaded` IN-SESSION
// (not on cold launch — that path stays with PendingInstallCountdown).
//
// Combined countdown + dialog. The dialog has THREE controls:
//   • Install Now (primary) — fires updates.install() immediately, ending
//                              the session and triggering quitAndInstall
//                              on the main side.
//   • Later                  — dismisses the dialog. The download stays on
//                              disk and the pending-install marker (saved
//                              by main) will trigger the existing 10s
//                              PendingInstallCountdown on the next launch.
//   • Pause / Resume         — toggles the auto-install countdown so the
//                              user can read the release tagline without
//                              feeling rushed. While paused, neither button
//                              auto-fires; Install / Later are still manual.
//
// Default countdown is 5 seconds. When it reaches zero, the dialog calls
// updates.install() (same as clicking Install Now).
//
// Per-version dismissal: clicking Later or Pause+close suppresses the
// dialog for that exact version string until a NEW update-downloaded
// fires for a different version.
// =============================================================
const COUNTDOWN_SECONDS = 5;

function InstallReadyDialog() {
  const [info, setInfo] = useState(null); // { version, releaseNotes }
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState(null);
  // Guard against firing install twice (countdown reaches zero AND user
  // clicks at the same time).
  const firedRef = useRef(false);

  // Subscribe to install-ready ping from main.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bridge = window.quillosofi?.updates;
    if (!bridge?.onInstallReady) return;
    const unsub = bridge.onInstallReady((payload) => {
      if (!payload || !payload.version) return;
      // Reset state for each new version. If the user dismissed this exact
      // version already in this session, don't re-pop.
      if (dismissedVersion === payload.version) return;
      firedRef.current = false;
      setInfo(payload);
      setSeconds(COUNTDOWN_SECONDS);
      setPaused(false);
    });
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, [dismissedVersion]);

  // Countdown ticker.
  useEffect(() => {
    if (!info || paused) return;
    if (seconds <= 0) {
      if (firedRef.current) return;
      firedRef.current = true;
      try { window.quillosofi?.updates?.install?.(); } catch (_) {}
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [info, seconds, paused]);

  const handleInstallNow = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    try { window.quillosofi?.updates?.install?.(); } catch (_) {}
  }, []);

  const handleLater = useCallback(() => {
    // Mark as dismissed for this version. Main has already persisted the
    // pending-install marker, so the user will see the existing 10s
    // PendingInstallCountdown on their next launch — nothing is lost.
    if (info?.version) setDismissedVersion(info.version);
    setInfo(null);
  }, [info?.version]);

  const handleTogglePause = useCallback(() => setPaused((p) => !p), []);

  if (!info) return null;

  // Pull a short tagline from release notes if present.
  const tagline = (() => {
    if (typeof info.releaseNotes === 'string' && info.releaseNotes.trim()) {
      const firstLine = info.releaseNotes.split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (firstLine && firstLine.length < 200) return firstLine;
    }
    return null;
  })();

  const pct = Math.max(0, Math.min(100, ((COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS) * 100));

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="install-ready-title"
    >
      <div
        className="w-[460px] max-w-[92vw] rounded-2xl border border-primary/30 bg-card shadow-2xl p-6 space-y-4"
        style={{ animation: 'installReadyPop 220ms ease-out' }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <h2
            id="install-ready-title"
            className="text-base font-semibold text-foreground"
          >
            Quillosofi v{info.version} ready to install
          </h2>
        </div>

        {tagline && (
          <p className="text-[13px] text-muted-foreground leading-snug border-l-2 border-primary/40 pl-3">
            {tagline}
          </p>
        )}

        <p className="text-sm text-muted-foreground leading-snug">
          {paused
            ? <>Countdown paused. Hit <span className="font-medium text-foreground">Install Now</span> when you’re ready, or <span className="font-medium text-foreground">Later</span> to defer.</>
            : <>Installing in <span className="font-mono text-primary tabular-nums">{seconds}s</span> unless you choose otherwise.</>}
        </p>

        {/* Big countdown number — dims when paused so it reads as held. */}
        <div className="flex items-center justify-center py-1">
          <span
            className={`font-mono font-semibold tabular-nums transition-opacity ${paused ? 'text-muted-foreground/60' : 'text-primary'}`}
            style={{ fontSize: '3.6rem', lineHeight: 1 }}
            aria-live="polite"
          >
            {seconds}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${paused ? 'bg-muted-foreground/40' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallNow}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Install Now
          </button>
          <button
            onClick={handleTogglePause}
            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 text-[13px] transition-colors gap-1.5"
            title={paused ? 'Resume countdown' : 'Pause countdown'}
            aria-label={paused ? 'Resume countdown' : 'Pause countdown'}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleLater}
            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 text-[13px] transition-colors"
            title="Install on next launch instead"
          >
            Later
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/80 text-center leading-snug">
          “Later” defers to the next launch — a 10s countdown will appear when you reopen Quillosofi.
        </p>
      </div>

      <style>{`
        @keyframes installReadyPop {
          0%   { transform: scale(0.92); opacity: 0; }
          60%  { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
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
      <InstallReadyDialog />
      <AutoUpdateProgressCard />
    </>
  );
}
