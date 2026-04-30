import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useCallback } from 'react';

/*
 * Renders a research answer with [n]-style citations turned into clickable
 * superscript pills that scroll to the corresponding source card.
 *
 * The transformation is done with a remark-style regex pre-pass on the raw
 * text: we replace `[n]` with `<sup data-cite="n">[n]</sup>` and let
 * react-markdown render it as raw HTML (rehype-raw handles that). Tap a
 * citation \u2192 the parent's onCiteClick(n) fires.
 */
function transformCitations(text, ids) {
  if (!text) return '';
  // Match standalone bracketed positive integers, optionally separated by
  // commas/spaces inside one bracket like [1, 2] or [1,2,3].
  return text.replace(/\[((?:\d+)(?:\s*,\s*\d+)*)\]/g, (_, group) => {
    const nums = group.split(',').map((n) => parseInt(n.trim(), 10)).filter(Boolean);
    if (!nums.length) return _;
    return nums
      .map((n) => {
        const ok = ids.has(n);
        const cls = ok
          ? 'cite-pill'
          : 'cite-pill cite-pill-missing';
        return `<sup data-cite="${n}" class="${cls}">${n}</sup>`;
      })
      .join('');
  });
}

export default function CitedAnswer({ answer, sources = [], onCiteClick }) {
  const ids = new Set(sources.map((s) => s.n));
  const transformed = transformCitations(answer || '', ids);

  // Click handler delegated from the wrapping div so we don't add one to
  // every superscript individually.
  const handleClick = useCallback(
    (e) => {
      const t = e.target;
      if (!(t && t.tagName === 'SUP' && t.dataset && t.dataset.cite)) return;
      const n = parseInt(t.dataset.cite, 10);
      if (Number.isFinite(n)) onCiteClick?.(n);
    },
    [onCiteClick]
  );

  return (
    <>
      <style>{`
        .cite-pill {
          display: inline-block;
          min-width: 1.2rem;
          padding: 0 0.3rem;
          margin: 0 0.1rem;
          font-size: 0.62rem;
          line-height: 1.1rem;
          font-weight: 600;
          border-radius: 999px;
          background: hsl(178, 80%, 22%);
          color: hsl(178, 60%, 85%);
          cursor: pointer;
          vertical-align: super;
          transition: background 120ms ease, color 120ms ease, transform 120ms ease;
          user-select: none;
        }
        .cite-pill:hover {
          background: hsl(178, 80%, 35%);
          color: white;
          transform: translateY(-1px);
        }
        .cite-pill-missing {
          background: hsl(0, 60%, 25%);
          color: hsl(0, 60%, 85%);
          cursor: not-allowed;
        }
      `}</style>
      <div
        className="prose prose-invert prose-sm max-w-none text-[hsl(220,7%,85%)] leading-relaxed"
        onClick={handleClick}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" />
            ),
          }}
        >
          {transformed}
        </ReactMarkdown>
      </div>
    </>
  );
}
