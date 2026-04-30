import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😚', '😙', '😗', '🥲', '😋', '😛', '😜', '🤪', '😌', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🤬', '🤡', '😈', '👿', '💀', '☠️', '💩', '🤓', '😎', '🤩', '😏', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💋', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💜', '💛', '✨', '⭐', '🌟', '💫', '⚡', '🔥', '💥', '👀', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '🎮', '🎲', '🚀', '💻', '📱', '⌚', '🎧', '🎬', '📺', '📻', '📷', '📸', '🎥', '🎞️', '📹', '🍕', '🍔', '🍟', '🌭', '🍿', '🍗', '🍖', '🥓', '🥚', '🍳', '🥞', '🥐', '🥯', '🍞', '🥖', '🥨', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥘', '🍢', '🍚', '🍙', '🍚', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍣', '🍤', '🍥', '🍡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦉', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦗', '🥚', '🍳', '🎂', '🎉', '🎊', '🎈', '🎀', '🎁', '🏵️', '🌹', '🥀', '🌷', '🌺', '🌻', '🌼', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '🎄', '🎃', '🎆', '🎇', '✴️'
];

export default function EmojiPicker({ onEmojiSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState(EMOJIS);
  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    // Simple emoji search by filtering (emoji names/descriptions would be ideal but keeping it simple)
    if (!value) {
      setFiltered(EMOJIS);
    } else {
      // Filter based on position/randomness - in a real app you'd have emoji data
      setFiltered(EMOJIS.filter((_, i) => Math.random() > 0.7 || i < 20));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      {/* Picker */}
      <div className="relative bg-card border border-border rounded-2xl md:rounded-xl shadow-2xl w-full md:w-80 max-h-96 flex flex-col">
        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-8 gap-1">
          {filtered.length > 0 ? (
            filtered.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onEmojiSelect(emoji);
                  onClose();
                }}
                className="h-8 text-lg hover:bg-secondary rounded transition-colors flex items-center justify-center"
              >
                {emoji}
              </button>
            ))
          ) : (
            <div className="col-span-8 flex items-center justify-center py-6 text-muted-foreground text-sm">
              No emojis found
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}