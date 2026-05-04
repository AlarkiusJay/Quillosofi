import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, FileText, Files, ArrowLeftRight, ZoomIn, ZoomOut, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ViewMenu — Word "View" tab condensed into a popover.
//
// Mirrors the Page Movement + Show + Zoom groups Alaria circled in her
// screenshots. Page Setup… opens the dialog.
//
// Props:
//   setup        current PageSetup
//   onChange     (partialSetup) => void
//   onOpenPageSetup () => void

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function ViewMenu({ setup, onChange, onOpenPageSetup }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position the portal-rendered popover under the button.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const POPOVER_W = 224;
    setPos({
      top: r.bottom + 4,
      // anchor right edge of popover to right edge of button
      left: Math.max(8, r.right - POPOVER_W),
    });
  }, [open]);

  const setMovement = (pageMovement) => onChange?.({ pageMovement });
  const setLayout = (pageLayout) => onChange?.({ pageLayout });
  const setZoom = (zoom) => onChange?.({ zoom });

  const Row = ({ icon: Icon, label, active, onClick, disabled }) => (
    <button
      onClick={() => { if (!disabled) { onClick(); } }}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded transition-colors text-left',
        disabled
          ? 'opacity-40 cursor-not-allowed text-[hsl(220,7%,55%)]'
          : active
            ? 'bg-[hsl(var(--chalk-deep))] text-[hsl(var(--chalk-yellow))]'
            : 'text-[hsl(220,7%,72%)] hover:bg-[hsl(var(--chalk-deep)/0.7)] hover:text-white'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1">{label}</span>
      {active && <Check className="h-3 w-3" />}
    </button>
  );

  const sideBySide = setup.pageMovement === 'side-to-side';

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        title="View"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="font-medium">View</span>
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="View options"
            className="fixed w-56 bg-[hsl(var(--chalk-deep)/0.97)] border border-[hsl(var(--chalk-white-faint)/0.25)] rounded-lg shadow-2xl backdrop-blur-md p-1"
            style={{ zIndex: 9999, top: pos.top, left: pos.left }}
          >
            <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[hsl(220,7%,50%)]">Page Movement</div>
            <Row
              icon={FileText}
              label="Vertical"
              active={setup.pageMovement === 'vertical'}
              onClick={() => setMovement('vertical')}
            />
            <Row
              icon={ArrowLeftRight}
              label="Side to Side"
              active={setup.pageMovement === 'side-to-side'}
              onClick={() => setMovement('side-to-side')}
            />

            <div className="my-1 h-px bg-[hsl(var(--chalk-white-faint)/0.15)]" />

            <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[hsl(220,7%,50%)]">Show</div>
            <Row
              icon={FileText}
              label="One Page"
              active={!sideBySide && setup.pageLayout === 'one'}
              disabled={sideBySide}
              onClick={() => setLayout('one')}
            />
            <Row
              icon={Files}
              label="Multiple Pages"
              active={!sideBySide && setup.pageLayout === 'multiple'}
              disabled={sideBySide}
              onClick={() => setLayout('multiple')}
            />

            <div className="my-1 h-px bg-[hsl(var(--chalk-white-faint)/0.15)]" />

            <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[hsl(220,7%,50%)]">Zoom</div>
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                onClick={() => setZoom(Math.max(0.5, +(setup.zoom - 0.25).toFixed(2)))}
                className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(var(--chalk-deep))] transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <select
                value={String(setup.zoom)}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 px-1 py-0.5 text-xs rounded bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white focus:outline-none font-mono text-center"
              >
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={String(z)}>{Math.round(z * 100)}%</option>
                ))}
              </select>
              <button
                onClick={() => setZoom(Math.min(2, +(setup.zoom + 0.25).toFixed(2)))}
                className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(var(--chalk-deep))] transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>

            <div className="my-1 h-px bg-[hsl(var(--chalk-white-faint)/0.15)]" />

            <Row
              icon={Settings2}
              label="Page Setup…"
              active={false}
              onClick={() => { setOpen(false); onOpenPageSetup?.(); }}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
