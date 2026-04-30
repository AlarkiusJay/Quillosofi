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