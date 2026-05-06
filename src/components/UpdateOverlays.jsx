/*
 * v0.4.51 — Update overlays: startup splash + pending-install countdown.
 *
 * Two unrelated-but-adjacent surfaces, both mounted at App root:
 *
 *   1. <SplashScreen /> — a brief chalkboard fade-in with the Quillosofi
 *      wordmark + spinner that plays for ~1.6s on every launch. Sets the
 *      tone before the actual UI renders.
 *
 *   2. <PendingInstallCountdown /> — listens for the main process's
 *      `updates:pending-install` event (fired 3s after launch when a
 *      download was staged last session AND auto-install is on). Shows a
 *      hard 10s countdown modal, then calls updates:install which fires
 *      quitAndInstall. There's no cancel button — it's punchy on purpose.
 *
 * Both are no-ops when window.quillosofi isn't present (web/dev outside
 * electron). The splash still plays on web for vibes.
 */
import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

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
// Combined wrapper — mount once at App root.
// =============================================================
export default function UpdateOverlays() {
  return (
    <>
      <SplashScreen />
      <PendingInstallCountdown />
    </>
  );
}
