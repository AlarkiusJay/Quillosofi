// CoverPicker — v0.6.65-Alpha2
//
// Alaria's rule (locked in v0.5 cycle): "Don't push Gen AI art into this,
// or images." So instead of an Unsplash/AI image picker, we ship a curated
// palette of chalkboard-themed gradient + solid covers. They render as a
// banner above the emoji+title block in QuillscriptEditor.
//
// Each cover is just a CSS background string (gradient or solid). When set,
// the canvas gets a `cover` field of shape:
//   { kind: 'swatch', id: 'deep-emerald' }
// QuillscriptEditor renders the swatch by ID. Future kinds (user-uploaded
// images, gradient builder) can be added without breaking the data model.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const COVER_SWATCHES = [
  { id: 'deep-emerald', label: 'Deep Emerald', bg: 'linear-gradient(135deg, hsl(155, 35%, 18%) 0%, hsl(150, 40%, 26%) 100%)' },
  { id: 'chalk-dusk', label: 'Chalk Dusk', bg: 'linear-gradient(135deg, hsl(230, 25%, 22%) 0%, hsl(255, 28%, 30%) 100%)' },
  { id: 'parchment', label: 'Parchment', bg: 'linear-gradient(135deg, hsl(38, 40%, 78%) 0%, hsl(35, 35%, 68%) 100%)' },
  { id: 'inkwell', label: 'Inkwell', bg: 'linear-gradient(135deg, hsl(220, 20%, 12%) 0%, hsl(225, 25%, 22%) 100%)' },
  { id: 'crimson', label: 'Crimson', bg: 'linear-gradient(135deg, hsl(355, 45%, 26%) 0%, hsl(15, 50%, 36%) 100%)' },
  { id: 'sunmark', label: 'Sunmark', bg: 'linear-gradient(135deg, hsl(45, 60%, 50%) 0%, hsl(30, 55%, 42%) 100%)' },
  { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(135deg, hsl(225, 50%, 10%) 0%, hsl(240, 45%, 18%) 100%)' },
  { id: 'forest', label: 'Forest', bg: 'linear-gradient(135deg, hsl(125, 30%, 16%) 0%, hsl(95, 28%, 28%) 100%)' },
  { id: 'amethyst', label: 'Amethyst', bg: 'linear-gradient(135deg, hsl(275, 35%, 24%) 0%, hsl(290, 30%, 36%) 100%)' },
  { id: 'sea-mist', label: 'Sea Mist', bg: 'linear-gradient(135deg, hsl(195, 30%, 22%) 0%, hsl(185, 35%, 38%) 100%)' },
  { id: 'rosewood', label: 'Rosewood', bg: 'linear-gradient(135deg, hsl(345, 28%, 22%) 0%, hsl(20, 22%, 30%) 100%)' },
  { id: 'slate', label: 'Slate', bg: 'linear-gradient(135deg, hsl(215, 12%, 22%) 0%, hsl(220, 14%, 32%) 100%)' },
];

export function getCoverBg(coverId) {
  if (!coverId) return null;
  const swatch = COVER_SWATCHES.find((s) => s.id === coverId);
  return swatch ? swatch.bg : null;
}

export default function CoverPicker({ anchorRef, currentCoverId, onPick, onRemove, onClose }) {
  const [pos, setPos] = useState(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e) => {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener('mousedown', handler);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popRef}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[10000] w-80 rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,12%)] shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[hsl(220,7%,55%)]">
          Choose a cover
        </span>
        {currentCoverId && (
          <button
            onClick={() => { onRemove?.(); onClose?.(); }}
            className="text-[10px] text-[hsl(220,7%,55%)] hover:text-red-400 transition-colors"
            title="Remove cover"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {COVER_SWATCHES.map((s) => (
          <button
            key={s.id}
            onClick={() => { onPick?.(s.id); onClose?.(); }}
            className={`group h-16 rounded-lg border transition-all overflow-hidden relative ${
              s.id === currentCoverId
                ? 'border-primary ring-2 ring-primary/40'
                : 'border-[hsl(225,9%,22%)] hover:border-primary/60'
            }`}
            style={{ background: s.bg }}
            title={s.label}
          >
            <span className="absolute inset-x-0 bottom-0 text-[9px] text-white/85 font-mono uppercase tracking-wider px-1.5 py-0.5 bg-black/30 truncate">
              {s.label}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[hsl(220,7%,40%)] leading-relaxed">
        Curated chalkboard palette. No external images — every cover is a pure CSS gradient.
      </p>
    </div>,
    document.body,
  );
}
