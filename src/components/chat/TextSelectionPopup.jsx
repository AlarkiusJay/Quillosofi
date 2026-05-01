import { useEffect, useState, useRef } from 'react';
import { MessageSquareQuote } from 'lucide-react';

export default function TextSelectionPopup({ containerRef, onQuote }) {
  const [contextMenu, setContextMenu] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleContextMenu = (e) => {
      if (!containerRef.current?.contains(e.target)) return;
      
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (!text || text.length < 3) {
        setContextMenu(null);
        return;
      }

      e.preventDefault();
      setContextMenu({ text, x: e.clientX, y: e.clientY });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [containerRef]);

  // v0.4.16: kill double-click word selection inside the chat container.
  // Drag-highlight (the actual AI follow-up trigger) MUST keep working, so we
  // intercept mousedown only when the click count is ≥2 (e.detail). Single
  // mousedown → drag flow is untouched. Triple-click line-select also blocked
  // since that compounds the same auto-select behavior the user finds noisy.
  useEffect(() => {
    const blockMultiClickSelect = (e) => {
      if (!containerRef.current?.contains(e.target)) return;
      // Don't interfere with inputs/textareas/contenteditable — users still
      // need to double-click to select words inside editable fields.
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (t?.isContentEditable) return;
      if (e.detail >= 2) {
        e.preventDefault();
        // Wipe any selection the OS already started before our preventDefault
        // landed (some browsers eagerly select on the down event).
        try { window.getSelection()?.removeAllRanges(); } catch (_) {}
      }
    };
    document.addEventListener('mousedown', blockMultiClickSelect);
    return () => document.removeEventListener('mousedown', blockMultiClickSelect);
  }, [containerRef]);

  // Hide context menu when clicking elsewhere
  useEffect(() => {
    const hide = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, []);

  const handleFollowUp = () => {
    if (contextMenu) {
      onQuote(contextMenu.text);
      setContextMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!contextMenu) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-xl"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        onClick={handleFollowUp}
        className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white hover:bg-[hsl(228,7%,27%)] transition-colors whitespace-nowrap"
      >
        <MessageSquareQuote className="h-3.5 w-3.5 text-primary" />
        Follow up
      </button>
    </div>
  );
}