/*
 * PostUpdateToast — soft floating banner that appears once on first launch
 * after a silent auto-install. Surfaces the version jump and a link to
 * "What's new" so the user isn't ambushed by a stealth version bump.
 *
 * Wired to `useFreshlyUpdated` (single source of truth — same hook the
 * Settings green-dot uses). Dismisses on click, on the X button, or when
 * the user opens Settings → Update (which also clears the green dot).
 *
 * v0.4.41: introduced after Alaria pointed out that auto-install switching
 * her from v0.4.38 to v0.4.40 with zero warning felt like a stealth ninja
 * move. This is the warning.
 */
import { useState, useEffect } from 'react';
import { Sparkles, X, ExternalLink } from 'lucide-react';
import { CHANGELOG } from '@/data/changelog';

export default function PostUpdateToast({ fromVersion, toVersion, onDismiss, onOpenChangelog }) {
  // Tiny mount delay so the toast slides in *after* the app shell paints.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 450);
    return () => clearTimeout(t);
  }, []);

  // Find the matching changelog entry for the new version, for the tagline.
  const entry = CHANGELOG.find((e) => e.version === toVersion);

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 max-w-sm pointer-events-auto transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-card border border-primary/40 rounded-xl shadow-2xl p-4 space-y-2 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Quillosofi just updated
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {fromVersion ? `v${fromVersion} → ` : ''}<span className="text-primary">v{toVersion}</span>
            </p>
            {entry?.tagline && (
              <p className="text-xs text-foreground/75 mt-2 leading-snug">{entry.tagline}</p>
            )}
            <button
              type="button"
              onClick={onOpenChangelog}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              See what's new
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
