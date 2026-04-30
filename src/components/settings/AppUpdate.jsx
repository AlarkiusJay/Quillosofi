import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✏️ Keep this in sync with the version in functions/getAppVersion.js
const CURRENT_VERSION = "1.0.0";
const CURRENT_DATE = "April 6, 2026";

export default function AppUpdate({ updateCount = 0 }) {
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

  const isUpToDate = latestVersion?.version === CURRENT_VERSION;

  const handleUpdate = () => {
    setUpdating(true);
    window.location.reload(true);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">

        {/* Current Version */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Installed Version</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-foreground">v{CURRENT_VERSION}</span>
            <span className="text-xs text-muted-foreground">— {CURRENT_DATE}</span>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Latest Version */}
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

        {/* Update available from ETag check */}
        {updateCount > 0 && (
          <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
            <p className="text-xs text-green-400 font-medium">
              A new update has been detected! Reload to apply the latest changes.
            </p>
          </div>
        )}

        {/* Status & Action */}
        {!loading && latestVersion && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {isUpToDate ? "You're on the latest version!" : 'A new version is available!'}
            </span>
          </div>
        )}

        {!loading && !isUpToDate && latestVersion && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A new version is available. Reload to get the latest features and improvements.
            </p>
          </div>
        )}

        <Button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Reloading…' : 'Force Reload'}
        </Button>
      </div>
    </div>
  );
}