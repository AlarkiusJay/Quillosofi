import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Download,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

// Bumped each release. Used by the web fallback view.
const FALLBACK_VERSION = '0.1.2';
const FALLBACK_DATE = 'April 30, 2026';

const isDesktop = typeof window !== 'undefined' && !!window.quillosofi?.isDesktop;

// =============================================================
// Web (Base44) view — original force-reload behavior
// =============================================================
function WebUpdateView({ updateCount = 0 }) {
  const [latestVersion, setLatestVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await base44.functions.invoke('getAppVersion', {});
        setLatestVersion(res.data);
      } catch (e) {
        console.error('Failed to fetch version:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchVersion();
  }, []);

  const isUpToDate = latestVersion?.version === FALLBACK_VERSION;
  const handleUpdate = () => {
    setUpdating(true);
    window.location.reload(true);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Installed Version</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-foreground">v{FALLBACK_VERSION}</span>
            <span className="text-xs text-muted-foreground">— {FALLBACK_DATE}</span>
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Latest Version</p>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Checking for updates…</span>
            </div>
          ) : latestVersion ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-foreground">v{latestVersion.version}</span>
              <span className="text-xs text-muted-foreground">— {latestVersion.date}</span>
              {isUpToDate && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Could not fetch latest version.</span>
          )}
        </div>

        <div className="border-t border-border" />

        {updateCount > 0 && (
          <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
            <p className="text-xs text-green-400 font-medium">
              A new update has been detected! Reload to apply the latest changes.
            </p>
          </div>
        )}

        {!loading && latestVersion && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {isUpToDate ? "You're on the latest version!" : 'A new version is available!'}
            </span>
          </div>
        )}

        <Button onClick={handleUpdate} disabled={updating} className="w-full flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Reloading…' : 'Force Reload'}
        </Button>
      </div>
    </div>
  );
}

// =============================================================
// Desktop view — full electron-updater integration
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
    settings: { autoInstall: true, autoCheck: true, channel: 'stable' },
  });
  const [busy, setBusy] = useState(false);

  // Pull initial status + subscribe to live state pushes.
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const initial = await window.quillosofi.updates.status();
        setState((s) => ({ ...s, ...initial }));
      } catch (_) {}
      unsub = window.quillosofi.updates.onState((payload) => setState((s) => ({ ...s, ...payload })));
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const handleCheck = useCallback(async () => {
    setBusy(true);
    try { await window.quillosofi.updates.check(); } finally { setBusy(false); }
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try { await window.quillosofi.updates.download(); } finally { setBusy(false); }
  }, []);

  const handleInstall = useCallback(async () => {
    setBusy(true);
    await window.quillosofi.updates.install();
  }, []);

  const toggleAutoInstall = useCallback(async (enabled) => {
    const next = await window.quillosofi.updates.setSettings({ autoInstall: !!enabled });
    setState((s) => ({ ...s, settings: next }));
  }, []);

  const toggleAutoCheck = useCallback(async (enabled) => {
    const next = await window.quillosofi.updates.setSettings({ autoCheck: !!enabled });
    setState((s) => ({ ...s, settings: next }));
  }, []);

  const { status, currentVersion, latestVersion, downloadPercent, error, releaseNotes, settings } = state;
  const isUpToDate = status === 'not-available' || (latestVersion && latestVersion === currentVersion);
  const hasUpdate = status === 'available' || status === 'downloading' || status === 'downloaded';

  // ---------- Status badge ----------
  let statusBlock;
  if (status === 'checking') {
    statusBlock = (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="text-sm">Checking for updates…</span>
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
          <p className="text-muted-foreground mt-0.5">Click Install &amp; Restart to finish, or it'll apply on next quit.</p>
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
    statusBlock = (
      <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-red-400 break-all">{error || 'Update check failed.'}</p>
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

  // ---------- Action button ----------
  let actionButton;
  if (status === 'downloaded') {
    actionButton = (
      <Button onClick={handleInstall} disabled={busy} className="w-full flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Install &amp; Restart
      </Button>
    );
  } else if (status === 'available') {
    actionButton = (
      <Button onClick={handleDownload} disabled={busy} className="w-full flex items-center gap-2">
        <Download className="h-4 w-4" />
        Download v{latestVersion}
      </Button>
    );
  } else if (status === 'downloading') {
    actionButton = (
      <Button disabled className="w-full flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Downloading…
      </Button>
    );
  } else {
    actionButton = (
      <Button
        onClick={handleCheck}
        disabled={busy || status === 'checking'}
        className="w-full flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
        {status === 'checking' ? 'Checking…' : 'Check for Updates'}
      </Button>
    );
  }

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

        {/* Latest */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Latest Version</p>
          {latestVersion ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-foreground">v{latestVersion}</span>
              {isUpToDate && <CheckCircle2 className="h-4 w-4 text-green-400" />}
              {hasUpdate && <Sparkles className="h-4 w-4 text-primary" />}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {status === 'checking' ? 'Checking…' : 'Not checked yet.'}
            </span>
          )}
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

        {/* Action */}
        {actionButton}

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

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Auto-download &amp; install</p>
            <p className="text-xs text-muted-foreground">Downloads in the background and installs on next quit.</p>
          </div>
          <Switch checked={!!settings.autoInstall} onCheckedChange={toggleAutoInstall} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Main export — picks view based on environment
// =============================================================
export default function AppUpdate({ updateCount = 0 }) {
  return isDesktop ? <DesktopUpdateView /> : <WebUpdateView updateCount={updateCount} />;
}
