// EmojiPicker — v0.6.65-Alpha2
//
// Lightweight emoji picker popover for canvas headers + sidebar entries.
// No external emoji library — we ship a curated set covering the common
// "Notion-style page icon" use cases: documents, writing, fantasy, nature,
// faces, symbols. ~120 emojis, grouped by category.
//
// Why no external library? @emoji-mart and friends pull in ~1MB of data
// + a search index. For a per-page icon picker, a curated palette is
// faster, smaller, and matches Alaria's chalkboard aesthetic better (she
// doesn't need every emoji ever — just expressive ones for worldbuilding).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EMOJI_GROUPS = [
  {
    name: 'Pages',
    items: ['📄', '📝', '📃', '📜', '📖', '📚', '📒', '📔', '📕', '📗', '📘', '📙', '🗒️', '🗓️', '🗃️', '🗂️'],
  },
  {
    name: 'Writing',
    items: ['✍️', '🖋️', '🖊️', '✒️', '🪶', '📐', '📏', '🔖', '🏷️', '💭', '💬', '🗯️', '🗨️', '🎙️', '🎼', '🎵'],
  },
  {
    name: 'Fantasy',
    items: ['🐉', '🦄', '🧙', '🧝', '🧚', '🧛', '🧜', '🏰', '⚔️', '🗡️', '🛡️', '🏹', '🪄', '🔮', '✨', '🌌'],
  },
  {
    name: 'Nature',
    items: ['🌲', '🌳', '🌴', '🌵', '🍀', '🌿', '🌾', '🌷', '🌸', '🌹', '🌺', '🌻', '🍂', '🍁', '❄️', '🔥'],
  },
  {
    name: 'Faces',
    items: ['😀', '😊', '🥰', '😎', '🤔', '😴', '😢', '😭', '😡', '🤯', '😱', '😈', '👻', '💀', '👁️', '👀'],
  },
  {
    name: 'Symbols',
    items: ['❤️', '💔', '⭐', '🌟', '⚡', '🌙', '☀️', '🪐', '🎭', '🎨', '🎬', '🎮', '🏆', '🎯', '⚖️', '☯️'],
  },
];

export default function EmojiPicker({ anchorRef, onPick, onClose }) {
  const [pos, setPos] = useState(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.left,
    });
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
      className="fixed z-[10000] w-72 max-h-80 overflow-y-auto rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,12%)] shadow-2xl p-3 spacerail-scroll"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[hsl(220,7%,55%)]">
          Pick an emoji
        </span>
        <button
          onClick={() => { onPick?.(null); onClose?.(); }}
          className="text-[10px] text-[hsl(220,7%,55%)] hover:text-white transition-colors"
          title="Reset to default"
        >
          Reset
        </button>
      </div>
      {EMOJI_GROUPS.map((g) => (
        <div key={g.name} className="mb-2.5 last:mb-0">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[hsl(220,7%,40%)] mb-1 px-0.5">
            {g.name}
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {g.items.map((e) => (
              <button
                key={e}
                onClick={() => { onPick?.(e); onClose?.(); }}
                className="h-7 w-7 text-base rounded hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors flex items-center justify-center"
                title={e}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
