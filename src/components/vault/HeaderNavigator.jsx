import { useState, useEffect } from 'react';
import { ListTree, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// HeaderNavigator — persistent left rail listing every H1/H2/H3 in the
// canvas, click-to-scroll. Two states:
//   collapsed → a 36px gutter with a centered toggle button (no longer floats
//               over the editor's writing area).
//   open      → expands to a 224px panel with the headings list.
//
// Reads from the contenteditable DOM (.ql-editor) directly because Quill's
// delta doesn't tag headings with stable ids. We index headings on every
// content change.
export default function HeaderNavigator({ quillRef, content }) {
  const [open, setOpen] = useState(false);
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const root = q.root;
    const nodes = Array.from(root.querySelectorAll('h1, h2, h3'));
    const collected = nodes.map((el, i) => {
      if (!el.id) el.id = `qfo-h-${i}-${(el.textContent || '').slice(0, 24).replace(/\s+/g, '-')}`;
      return {
        id: el.id,
        text: el.textContent || `Untitled ${i + 1}`,
        level: parseInt(el.tagName.slice(1), 10),
      };
    });
    setHeadings(collected);
  }, [content, quillRef]);

  const handleJump = (id) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const root = q.root;
    const target = root.querySelector(`#${CSS.escape(id)}`);
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Collapsed state: persistent 36px gutter on the left, no floating overlay.
  if (!open) {
    return (
      <aside className="w-9 shrink-0 border-r border-[hsl(var(--chalk-white-faint)/0.15)] bg-[hsl(var(--chalk-deep)/0.55)] backdrop-blur-sm flex flex-col items-center pt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Show outline"
          aria-label="Show document outline"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-[hsl(220,7%,60%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.85)] transition-colors group relative"
        >
          <ListTree className="h-4 w-4" />
          <span className="absolute left-full ml-2 px-2 py-1 rounded bg-[hsl(var(--chalk-deep))] border border-[hsl(var(--chalk-white-faint)/0.2)] text-[10px] text-[hsl(220,14%,90%)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
            Outline
          </span>
        </button>
        {/* Vertical 'OUTLINE' label, decorative, only when there are headings */}
        {headings.length > 0 && (
          <span
            className="mt-3 text-[9px] uppercase tracking-[0.18em] text-[hsl(220,7%,42%)] font-semibold select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {headings.length} heading{headings.length === 1 ? '' : 's'}
          </span>
        )}
      </aside>
    );
  }

  // ── Open state: 224px panel.
  return (
    <aside className="w-56 shrink-0 border-r border-[hsl(var(--chalk-white-faint)/0.18)] bg-[hsl(var(--chalk-deep)/0.55)] backdrop-blur-sm flex flex-col">
      <header className="px-3 py-2 flex items-center justify-between border-b border-[hsl(var(--chalk-white-faint)/0.15)]">
        <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--chalk-yellow))] font-semibold flex items-center gap-1.5">
          <ListTree className="h-3.5 w-3.5" /> Outline
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Hide outline"
          aria-label="Hide outline"
          className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto py-1">
        {headings.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-[hsl(220,7%,50%)] italic leading-relaxed">
            No headings yet. Add an H1, H2, or H3 from the toolbar to populate this outline.
          </p>
        ) : (
          <ul className="space-y-px">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => handleJump(h.id)}
                  className={cn(
                    'w-full text-left text-xs leading-snug py-1 hover:bg-[hsl(var(--chalk-deep)/0.7)] hover:text-[hsl(var(--chalk-yellow))] transition-colors truncate',
                    h.level === 1 && 'pl-3 pr-2 text-[hsl(220,14%,90%)] font-semibold',
                    h.level === 2 && 'pl-5 pr-2 text-[hsl(220,7%,75%)]',
                    h.level === 3 && 'pl-7 pr-2 text-[hsl(220,7%,60%)] text-[11px]'
                  )}
                  title={h.text}
                >
                  {h.text || `Heading ${h.level}`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
