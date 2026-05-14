/*
 * Settings → Update tab.
 *
 * Quillosofi is a desktop app, so this panel only ever talks to the Electron
 * auto-updater bridge (`window.quillosofi.updates`). The bridge proxies to
 * electron-updater, which checks the GitHub `AlarkiusJay/Quillosofi` releases
 * feed for newer tagged installers.
 *
 * v0.4.5: removed the legacy WebUpdateView (force-reload + dead network call)
 * since there is no web build. If the bridge isn't present (dev `vite` server
 * running outside electron) we render a clear notice instead of pretending
 * to be a PWA.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Download,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { entriesUpTo } from '@/data/changelog';

const FEED_URL = 'https://github.com/AlarkiusJay/Quillosofi/releases';

// v0.4.14: stealth twin prank button removed from the Update tab. The easter
// egg lives elsewhere now — keeping this surface strictly functional so the
// updater is unambiguously legit. (See whichever component currently hosts
// the sass tiers; this file is intentionally clean.)

// Format an epoch ms into a friendly relative-ish timestamp.
function formatChecked(ts) {
  if (!ts) return 'never';
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `today at ${time}` : `${d.toLocaleDateString()} ${time}`;
}

// =============================================================
// Bridge-missing fallback — what the user sees if the Electron preload
// somehow didn't expose `window.quillosofi.updates`. Should never happen on
// a packaged build; useful during `npm run dev` outside electron.
// =============================================================
function NoBridgeView() {
  return (
    <div className="py-4 space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Updates Unavailable</p>
        <p className="text-sm text-foreground/80">
          The Electron updater bridge isn't loaded. This usually means you're running the Vite
          dev server in a regular browser tab instead of through the desktop shell.
        </p>
        <a
          href={FEED_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open the GitHub Releases page
        </a>
      </div>
    </div>
  );
}

// =============================================================
// Desktop view — full electron-updater integration.
// =============================================================
function DesktopUpdateView() {
  const [state, setState] = useState({
    status: 'idle',
    currentVersion: '...',
    latestVersion: null,
    releaseNotes: null,
    releaseDate: null,
    downloadPercent: 0,
    error: null,
    lastChecked: null,
    settings: { autoInstall: false, autoCheck: true, channel: 'stable' },
  });
  const [busy, setBusy] = useState(false);
  // v0.5.72 — the manual "Check for Updates" button now runs a single
  // pipeline: scan animation → (if newer found) auto-fire downloadUpdate →
  // "Install & Restart" CTA. The fake-progress bar still runs during the
  // network round-trip because electron-updater's checkForUpdates() emits
  // no granular events; once that settles, the bar gets out of the way and
  // the real download-progress events drive the percent display.
  const [scanProgress, setScanProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  // v0.5.82 — `scanLabel` lets the same progress bar drive multiple labels
  // across the manual-check pipeline:
  //   1. "Scanning for updates…"        (Check for Updates click)
  //   2. "Fetching latest release from GitHub…" (Download New Update click,
  //      pre-download phase while we hit the releases feed)
  // The real download phase ('downloading' status) renders its OWN block
  // with the live percent, so we just need to cover the two pre-states.
  const [scanLabel, setScanLabel] = useState('Scanning for updates\u2026');
  const [showDiag, setShowDiag] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);
  // v0.4.17: Changelog block — collapsed by default to stay calm; expand
  // toggles in-place like the Diagnostic. Inside, the entry matching the
  // currently-installed version is auto-expanded so users see what they just
  // got; older entries collapse to a single-row tag + tagline.
  const [showChangelog, setShowChangelog] = useState(false);
  const [openVersions, setOpenVersions] = useState({});
  // Pull initial status + subscribe to live state pushes. Also auto-fire one
  // check on mount so the panel isn't stuck on "Not checked yet" forever.
  useEffect(() => {
    let unsub = null;
    let cancelled = false;
    (async () => {
      try {
        const initial = await window.quillosofi.updates.status();
        if (!cancelled) setState((s) => ({ ...s, ...initial }));
      } catch (_) {}
      unsub = window.quillosofi.updates.onState((payload) =>
        setState((s) => ({ ...s, ...payload }))
      );
      // If we've never checked (or the last check is stale), fire one.
      try {
        const initial = await window.quillosofi.updates.status();
        const stale = !initial?.lastChecked ||
          (Date.now() - initial.lastChecked) > 1000 * 60 * 30; // 30 min
        if (stale && !cancelled) {
          window.quillosofi.updates.check().catch(() => {});
        }
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  // v0.5.3 — arms the global <AutoUpdateProgressCard /> so manual flows
  // surface the same bottom-right toast the auto path uses. The card listens
  // for this window event and flips its `manuallyArmed` flag on. Cleared
  // when the user dismisses the card.
  const armProgressCard = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent('quillosofi:update-card-arm')); } catch (_) {}
  }, []);

  const handleCheck = useCallback(async () => {
    armProgressCard();
    setBusy(true);
    try { await window.quillosofi.updates.check(); } finally { setBusy(false); }
  }, [armProgressCard]);

  // v0.5.72 — manual-check pipeline. Scan animation runs in parallel with
  // the real GitHub fetch. When the check resolves with `update-available`,
  // we auto-fire downloadUpdate so the installer is on disk by the time
  // the user clicks "Install & Restart". This matches Alaria's mental
  // model: scan → installing → install. No more autoInstall toggle
  // race — the renderer is the single source of truth for download timing.
  // v0.5.82 — runs the fake progress bar while a network round-trip is in
  // flight (electron-updater's checkForUpdates / downloadUpdate emit no
  // granular progress until the actual blob fetch starts, so we ease the
  // first ~1.8s with a synthetic ramp). Returns once both the request and
  // the animation have settled. Caller decides what to do next.
  const runScanWith = useCallback(async (label, work) => {
    setScanLabel(label);
    setScanning(true);
    setScanProgress(0);
    const start = Date.now();
    const DURATION = 1800;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setScanProgress(pct);
    };
    const interval = setInterval(tick, 60);
    const result = await Promise.resolve(work()).catch(() => null);
    await new Promise((r) => setTimeout(r, DURATION));
    clearInterval(interval);
    setScanProgress(100);
    await new Promise((r) => setTimeout(r, 220));
    setScanning(false);
    setScanProgress(0);
    return result;
  }, []);

  const handleScanThenCheck = useCallback(async () => {
    if (scanning || busy) return;
    armProgressCard();
    const result = await runScanWith(
      'Scanning for updates\u2026',
      () => window.quillosofi.updates.check()
    );
    // If the check turned up a newer version, kick the download right
    // away. The download-progress + downloaded events from main.cjs flip
    // the status block to its 'downloading' / 'downloaded' renderings.
    const info = result && result.ok ? result.info : null;
    if (info && info.version && info.version !== state.currentVersion) {
      try { await window.quillosofi.updates.download(); } catch (_) {}
    }
  }, [scanning, busy, armProgressCard, state.currentVersion, runScanWith]);

  const handleDownload = useCallback(async () => {
    armProgressCard();
    setBusy(true);
    try { await window.quillosofi.updates.download(); } finally { setBusy(false); }
  }, [armProgressCard]);

  // v0.5.82 — Combined "Check + Download" with visible progress feedback.
  // Phase 1: "Fetching latest release from GitHub…" (synthetic bar) while
  // we hit the releases feed. Phase 2: hand off to electron-updater's real
  // download-progress events, which the 'downloading' statusBlock renders
  // with the actual byte-percent. If the check fails or there's nothing
  // newer, the bar settles and we surface the result (up-to-date / error)
  // via the regular status block.
  const handleCheckAndDownload = useCallback(async () => {
    if (scanning || busy) return;
    armProgressCard();
    const res = await runScanWith(
      'Fetching latest release from GitHub\u2026',
      () => window.quillosofi.updates.check()
    );
    if (res?.ok && res?.info && res.info.version && res.info.version !== state.currentVersion) {
      try { await window.quillosofi.updates.download(); } catch (_) {}
    }
  }, [state.currentVersion, armProgressCard, scanning, busy, runScanWith]);

  const handleInstall = useCallback(async () => {
    setBusy(true);
    await window.quillosofi.updates.install();
  }, []);

  // v0.5.72 — toggleAutoInstall removed; the toggle is gone from the UI
  // and the underlying setting is no longer read by main.cjs.
  const toggleAutoCheck = useCallback(async (enabled) => {
    const next = await window.quillosofi.updates.setSettings({ autoCheck: !!enabled });
    setState((s) => ({ ...s, settings: next }));
  }, []);

  const handleCopyDiag = useCallback(async () => {
    const header = [
      `Quillosofi Update Diagnostic`,
      `------------------------------`,
      `Installed:        v${state.currentVersion}`,
      `Latest seen:      ${state.latestVersion ? 'v' + state.latestVersion : '(not yet seen)'}`,
      `Status:           ${state.status}`,
      `Updater mod:      ${state.updaterAvailable ? 'loaded' : 'NOT LOADED'}`,
      `Updater error:    ${state.updaterLoadError || '(none)'}`,
      `Dev mode:         ${state.isDev ? 'yes (auto-update disabled in dev)' : 'no'}`,
      `Allow prerelease: true (Alpha/Beta enabled)`,
      `Last checked:     ${formatChecked(state.lastChecked)}`,
      `Last error:       ${state.error || '(none)'}`,
      `Feed:             ${state.feedUrl || FEED_URL}`,
      `Download %:       ${state.downloadPercent}`,
      `Auto-check:       ${state.settings?.autoCheck ? 'on' : 'off'}`,
      `Channel:          ${state.settings?.channel || 'stable'}`,
    ];
    // v0.6.95-Alpha4 — append the rolling events buffer so support
    // tickets carry the actual electron-updater trail, not just the
    // summary snapshot.
    const evs = state.events || [];
    const eventLines = evs.length === 0
      ? [``, `Recent updater events (0):`, `  (none)`]
      : [``, `Recent updater events (${evs.length}):`, ...evs.map((ev) => {
          const ts = ev.ts ? new Date(ev.ts).toISOString() : '';
          return `  [${ts}] ${(ev.kind || 'info').padEnd(5)} ${ev.message}`;
        })];
    const diag = [...header, ...eventLines].join('\n');
    try {
      await navigator.clipboard.writeText(diag);
      setDiagCopied(true);
      setTimeout(() => setDiagCopied(false), 1800);
    } catch (_) {}
  }, [state]);

  const { status, currentVersion, latestVersion, downloadPercent, error, releaseNotes, settings, lastChecked, updaterAvailable, updaterLoadError, isDev } = state;
  const isUpToDate = status === 'not-available' || (latestVersion && latestVersion === currentVersion);
  const hasUpdate = status === 'available' || status === 'downloading' || status === 'downloaded';

  // ---------- Status block ----------
  // v0.4.51 — manual scan animation takes precedence over the regular
  // 'checking' state when active, so the user sees the progress bar.
  let statusBlock;
  if (scanning) {
    statusBlock = (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {scanLabel}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{scanProgress}%</span>
        </div>
        <Progress value={scanProgress} className="h-2" />
      </div>
    );
  } else if (status === 'checking') {
    statusBlock = (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="text-sm">Checking GitHub for the latest release…</span>
      </div>
    );
  } else if (status === 'downloading') {
    statusBlock = (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-primary">
            <Download className="h-4 w-4 animate-pulse" />
            Downloading v{latestVersion}…
          </span>
          <span className="font-mono text-xs text-muted-foreground">{downloadPercent}%</span>
        </div>
        <Progress value={downloadPercent} className="h-2" />
      </div>
    );
  } else if (status === 'downloaded') {
    statusBlock = (
      <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2.5">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs">
          <p className="font-medium text-primary">v{latestVersion} is ready to install.</p>
          <p className="text-muted-foreground mt-0.5">Click Restart &amp; Install to finish, or it'll apply on next quit.</p>
        </div>
      </div>
    );
  } else if (status === 'available') {
    statusBlock = (
      <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
        <Sparkles className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
        <p className="text-xs text-green-400 font-medium">
          A new version (v{latestVersion}) is available.
        </p>
      </div>
    );
  } else if (status === 'error') {
    // Soften the wall-of-text electron-updater error into something
    // friendlier. The raw payload is still available in Diagnostic below
    // for support tickets. Most common cause: CI hasn't published
    // latest.yml for a freshly-pushed tag yet (404 on the manifest).
    const looksLikeFreshTag404 = typeof error === 'string' && /404/.test(error) && /latest\.yml/i.test(error);
    statusBlock = (
      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-100/90 leading-relaxed">
          <p className="font-medium text-amber-200">
            Never gonna give you, never gonna let you down—wait actually—try checking for an update later lol. In like ~10 minutes.
          </p>
          {looksLikeFreshTag404 && (
            <p className="mt-1 text-[11px] opacity-75">
              (Looks like a release was just tagged but its installer manifest hasn’t been published yet. CI is probably still building.)
            </p>
          )}
          <p className="mt-1 text-[11px] opacity-60">Full error details are in the Diagnostic panel below.</p>
        </div>
      </div>
    );
  } else if (isUpToDate) {
    statusBlock = (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">You're on the latest version.</span>
      </div>
    );
  }

  // ---------- Action buttons ----------
  // The right-hand action button morphs in place across states instead of
  // unmounting/remounting different <Button> elements per state — that was
  // the source of the glitch/flash on every status update. We compute one
  // `action` descriptor and feed it to a single persistent <Button>.
  const checking = status === 'checking' || busy || scanning;
  const downloading = status === 'downloading';
  const installable = status === 'downloaded';
  const downloadable = status === 'available';

  // Real action button is purely the legitimate Install/Download CTA —
  // never hijacked by easter eggs. (v0.4.14: prank twin removed entirely.)
  // v0.6.95-Alpha4 — button morphs to match MultiRP exactly:
  //   idle        → Download Update     (kicks check + auto-download)
  //   available   → Starting download…  (brief, autoDownload fires immediately)
  //   downloading → Downloading X%      (disabled, spinner, percent in label)
  //   downloaded  → Restart & Install   (primary CTA — fires quitAndInstall)
  const action = (() => {
    if (installable) {
      return { label: 'Restart & Install', icon: <RefreshCw className="h-4 w-4" />, onClick: handleInstall, disabled: busy, variant: 'default' };
    }
    if (downloading) {
      return { label: `Downloading ${downloadPercent}%`, icon: <Loader2 className="h-4 w-4 animate-spin" />, onClick: undefined, disabled: true, variant: 'default' };
    }
    if (downloadable) {
      return { label: 'Starting download\u2026', icon: <Loader2 className="h-4 w-4 animate-spin" />, onClick: undefined, disabled: true, variant: 'default' };
    }
    return { label: 'Download Update', icon: <Download className="h-4 w-4" />, onClick: handleCheckAndDownload, disabled: checking, variant: 'default' };
  })();

  return (
    <div className="py-4 space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        {/* Installed */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Installed Version</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-foreground">v{currentVersion}</span>
            <span className="text-xs text-muted-foreground">— Desktop build</span>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Latest + MultiRP-style status badge */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Latest Version</p>
          {latestVersion ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-medium text-foreground">v{latestVersion}</span>
              {isUpToDate && <CheckCircle2 className="h-4 w-4 text-green-400" />}
              {hasUpdate && <Sparkles className="h-4 w-4 text-primary" />}
              {/* v0.6.95-Alpha4 — MultiRP-style state badge. Sits inline with
                  the latest-version row so it's the first thing the eye lands
                  on when the user checks back in after kicking off a download. */}
              {status === 'available' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green-300 bg-green-500/15 border border-green-500/30 rounded px-2 py-0.5">
                  Update Available — v{latestVersion}
                </span>
              )}
              {status === 'downloading' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 rounded px-2 py-0.5">
                  Downloading… {downloadPercent}%
                </span>
              )}
              {status === 'downloaded' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded px-2 py-0.5">
                  Update Ready — v{latestVersion}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {status === 'checking' ? 'Checking…' : 'Not checked yet.'}
            </span>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Last checked: {formatChecked(lastChecked)}
          </p>
        </div>

        <div className="border-t border-border" />

        {/* Status */}
        {statusBlock}

        {/* Release notes preview */}
        {releaseNotes && hasUpdate && (
          <div className="bg-muted/30 border border-border rounded-lg p-3 max-h-40 overflow-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Release Notes</p>
            <div
              className="text-xs text-foreground/80 prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: typeof releaseNotes === 'string' ? releaseNotes : '' }}
            />
          </div>
        )}

        {/* Actions — simple two-up: Check for Updates + the morphing action
            button (Download / Install / Downloading). v0.4.14: stealth twin
            removed; the prank lives somewhere else in the app now. */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleScanThenCheck}
            disabled={checking || downloading}
            className="w-full flex items-center gap-2"
          >
            <span
              key={checking ? 'checking' : 'idle'}
              className="flex items-center gap-2 transition-opacity duration-300 animate-in fade-in"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking…' : 'Check for Updates'}
            </span>
          </Button>

          {/* Persistent action button. Contents key on label so transitions
              crossfade instead of popping (300ms). */}
          <Button
            onClick={action.onClick}
            disabled={action.disabled}
            className="w-full flex items-center gap-2"
          >
            <span
              key={action.label}
              className="flex items-center gap-2 transition-opacity duration-300 animate-in fade-in"
            >
              {action.icon}
              {action.label}
            </span>
          </Button>
        </div>

        {/* Open release page */}
        <button
          type="button"
          onClick={() => window.quillosofi.updates.openReleasePage()}
          className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View all releases on GitHub
        </button>
      </div>

      {/* Changelog — v0.4.17. Mirrors the Diagnostic block's collapsed-by-
          default pattern. Lists every release up through the installed
          version, newest first. The entry for the installed version is
          auto-expanded; older entries collapse to a single-row summary. */}
      <ChangelogBlock
        currentVersion={currentVersion}
        show={showChangelog}
        onToggle={() => setShowChangelog((v) => !v)}
        openVersions={openVersions}
        setOpenVersions={setOpenVersions}
      />

      {/* Preferences */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Update Preferences</p>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Check for updates on launch</p>
            <p className="text-xs text-muted-foreground">Quillosofi will silently check 3s after starting.</p>
          </div>
          <Switch checked={!!settings.autoCheck} onCheckedChange={toggleAutoCheck} />
        </div>

        {/* v0.5.72 — "Auto-download & install" toggle removed. The flow is
            now strictly user-driven: silent check on launch (the toggle
            above) populates the Settings-gear badge; the user clicks
            Check for Updates, then Restart & Install, when they're ready.
            See AppUpdate.jsx history for the previous racy two-toggle setup. */}
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="text-muted-foreground text-xs leading-tight mt-0.5" aria-hidden="true">ℹ</span>
          <p className="text-xs text-muted-foreground leading-snug">
            Updates download automatically when you click <span className="font-medium text-foreground">Check for Updates</span>, then wait for you to click <span className="font-medium text-foreground">Restart &amp; Install</span>. Nothing installs without your okay.
          </p>
        </div>
      </div>

      {/* Diagnostic — collapsed by default. Surface for support tickets. */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <button
          type="button"
          onClick={() => setShowDiag((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <span>Diagnostic</span>
          {showDiag ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {showDiag && (
          <div className="space-y-3">
            <pre className="bg-muted/40 border border-border rounded-lg p-3 text-[11px] font-mono text-foreground/80 overflow-auto leading-relaxed whitespace-pre-wrap break-all">
{`Installed:        v${currentVersion}
Latest seen:      ${latestVersion ? 'v' + latestVersion : '(not yet seen)'}
Status:           ${status}
Updater mod:      ${updaterAvailable ? 'loaded' : 'NOT LOADED'}
Updater error:    ${updaterLoadError || '(none)'}
Dev mode:         ${isDev ? 'yes (auto-update disabled in dev)' : 'no'}
Allow prerelease: true (Alpha/Beta enabled)
Last checked:     ${formatChecked(lastChecked)}
Last error:       ${error || '(none)'}
Feed:             ${state.feedUrl || FEED_URL}
Auto-check:       ${settings.autoCheck ? 'on' : 'off'}`}
            </pre>

            {/* v0.6.95-Alpha4 — rolling log of the last ~20 updater events.
                Mirrors the MultiRP diagnostic panel: every electron-updater
                signal + logger line flows through main.cjs's logUpdaterEvent
                into state.events, so support tickets can see exactly what
                the underlying library is doing. */}
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent updater events ({(state.events || []).length})
              </p>
              {(state.events || []).length === 0 ? (
                <p className="text-[11px] font-mono text-muted-foreground/70 italic">
                  No events yet — try checking for updates.
                </p>
              ) : (
                <ul className="space-y-0.5 max-h-48 overflow-auto text-[11px] font-mono">
                  {state.events.slice().reverse().map((ev, idx) => {
                    const tone =
                      ev.kind === 'error' ? 'text-amber-300' :
                      ev.kind === 'warn'  ? 'text-amber-200/80' :
                      ev.kind === 'event' ? 'text-primary/90' :
                                            'text-foreground/70';
                    const ts = ev.ts ? new Date(ev.ts).toLocaleTimeString() : '';
                    return (
                      <li key={idx} className={`${tone} break-all leading-relaxed`}>
                        <span className="text-muted-foreground/60">[{ts}]</span>{' '}
                        <span className="text-muted-foreground/80">{(ev.kind || 'info').padEnd(5)}</span>{' '}
                        {ev.message}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyDiag}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3 w-3" />
              {diagCopied ? 'Copied!' : 'Copy diagnostic'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================
// Changelog block — collapsed by default. Once opened, lists every
// release up through the installed version, newest first. The entry for
// the installed version is auto-expanded so users land on "what they just
// got"; older versions collapse to a single-row tagline.
// =============================================================
function ChangelogBlock({ currentVersion, show, onToggle, openVersions, setOpenVersions }) {
  const entries = entriesUpTo(currentVersion);
  // The installed version is open by default once the panel is expanded;
  // user toggles override that. Track via the controlled `openVersions` map.
  const isEntryOpen = (v) => {
    if (Object.prototype.hasOwnProperty.call(openVersions, v)) return openVersions[v];
    return v === currentVersion; // default: open the installed version
  };
  const toggleEntry = (v) => {
    setOpenVersions((m) => ({ ...m, [v]: !isEntryOpen(v) }));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>Changelog</span>
        {show ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {show && (
        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No changelog entries available.</p>
          )}
          {entries.map((e) => {
            const open = isEntryOpen(e.version);
            const isInstalled = e.version === currentVersion;
            return (
              <div
                key={e.version}
                className={`bg-muted/40 border rounded-lg overflow-hidden ${
                  isInstalled ? 'border-primary/40' : 'border-border'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleEntry(e.version)}
                  className="w-full flex items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium text-foreground">v{e.version}</span>
                      {isInstalled && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                          Installed
                        </span>
                      )}
                      {e.date && (
                        <span className="text-[10px] text-muted-foreground font-mono">{e.date}</span>
                      )}
                    </div>
                    {e.tagline && (
                      <p className="text-xs text-foreground/80 mt-1 leading-snug">{e.tagline}</p>
                    )}
                  </div>
                  <span className="shrink-0 mt-0.5 text-muted-foreground">
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {open && Array.isArray(e.changes) && e.changes.length > 0 && (
                  <ul className="px-4 pb-3 pt-1 space-y-1.5 list-disc list-outside ml-5 text-xs text-foreground/80 leading-relaxed">
                    {e.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Export — picks view based on whether the Electron preload bridge is live.
// =============================================================
export default function AppUpdate() {
  const [hasBridge, setHasBridge] = useState(
    () => typeof window !== 'undefined' && !!window.quillosofi?.updates
  );

  // Re-check on mount in case the preload hydrated after first render.
  useEffect(() => {
    if (!hasBridge && typeof window !== 'undefined' && !!window.quillosofi?.updates) {
      setHasBridge(true);
    }
  }, [hasBridge]);

  return hasBridge ? <DesktopUpdateView /> : <NoBridgeView />;
}
