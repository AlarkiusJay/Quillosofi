import { useState, useEffect, useMemo } from 'react';
import { ListTree, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// HeaderNavigator — collapsible side rail listing every H1/H2/H3 in the
// canvas, click-to-scroll. Lives inside the CanvasEditor flex column so it
// works in both modal and embedded modes.
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
    // The .ql-editor element holds the rendered DOM.
    const root = q.root;
    const nodes = Array.from(root.querySelectorAll('h1, h2, h3'));
    const collected = nodes.map((el, i) => {
      // Stamp a stable id we can scroll to.
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Show outline"
        className="absolute left-2 top-2 z-10 h-8 w-8 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors"
        aria-label="Show document outline"
      >
        <ListTree className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-[hsl(var(--chalk-white-faint)/0.18)] bg-[hsl(var(--chalk-deep)/0.5)] backdrop-blur-sm flex flex-col">
      <header className="px-3 py-2 flex items-center justify-between border-b border-[hsl(var(--chalk-white-faint)/0.15)]">
        <span className="text-[11px] uppercase tracking-wider text-[hsl(var(--chalk-yellow))] font-semibold flex items-center gap-1.5">
          <ListTree className="h-3.5 w-3.5" /> Outline
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Hide outline"
          className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors"
          aria-label="Hide outline"
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
