import { ExternalLink, BookmarkPlus, BookmarkCheck, Trash2 } from 'lucide-react';
import { domainFromUrl } from '@/lib/research';
import Tooltip from '@/components/Tooltip';

/*
 * A single source card. Used in the right-side Sources panel of a research
 * answer AND in the Sources Vault list.
 *
 * Props:
 *   source: { n, title, url, snippet, publisher, published_at }
 *   saved:  boolean   \u2014 whether this source is in the Sources Vault
 *   onSave: () => void
 *   onRemove: () => void  (used by the Vault to delete a saved source)
 *   onJump: () => void    (optional: scroll to the matching citation in the answer)
 *   highlight: boolean    (briefly glow when the user clicked [n] in the answer)
 *   showNumber: boolean   (default true \u2014 shows the [n] badge)
 */
export default function SourceCard({
  source,
  saved = false,
  onSave,
  onRemove,
  onJump,
  highlight = false,
  showNumber = true,
}) {
  if (!source) return null;
  const dom = source.publisher || domainFromUrl(source.url);

  return (
    <div
      data-source-n={source.n}
      className={`group relative bg-card rounded-lg border p-3 transition-all ${
        highlight
          ? 'border-primary shadow-[0_0_0_2px_hsl(178,80%,30%,0.4)]'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-start gap-2">
        {showNumber && typeof source.n === 'number' && (
          <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
            {source.n}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-white hover:text-primary line-clamp-2 leading-snug"
          >
            {source.title || source.url}
          </a>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            {dom && <span className="truncate max-w-[140px]">{dom}</span>}
            {source.published_at && (
              <>
                <span>\u00b7</span>
                <span>{source.published_at}</span>
              </>
            )}
          </div>
          {source.snippet && (
            <p className="text-[11px] text-[hsl(220,7%,70%)] mt-1.5 line-clamp-3 leading-relaxed">
              {source.snippet}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
        <Tooltip text="Open source">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </Tooltip>
        {onJump && (
          <Tooltip text="Find in answer">
            <button
              onClick={onJump}
              className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              Jump
            </button>
          </Tooltip>
        )}
        <div className="flex-1" />
        {onRemove ? (
          <Tooltip text="Remove from vault">
            <button
              onClick={onRemove}
              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Tooltip>
        ) : onSave ? (
          <Tooltip text={saved ? 'Saved to vault' : 'Save to Sources Vault'}>
            <button
              onClick={onSave}
              disabled={saved}
              className={`p-1.5 rounded transition-colors ${
                saved
                  ? 'text-primary cursor-default'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              {saved ? <BookmarkCheck className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
