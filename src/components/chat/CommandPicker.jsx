import { useEffect, useState } from 'react';

const COMMANDS = [
  { name: '/canvas', description: 'Open a canvas note to write context or notes', emoji: '📄' },
  { name: '/spreadsheet', description: 'Open a spreadsheet with formulas and export', emoji: '📊' },
  { name: '/8ball', description: 'Ask the magic 8ball a question', emoji: '🎱' },
  { name: '/tableflip', description: 'Flip a table (╯°□°)╯︵ ┻━┻', emoji: '🪑' },
  { name: '/untableflip', description: 'ZetrylGPT flips the table instead', emoji: '😤' },
];

export default function CommandPicker({ query, onSelect, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = COMMANDS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!filtered.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        onSelect(filtered[activeIndex].name);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (!filtered.length) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-56 sm:w-72 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,20%)] rounded-lg shadow-2xl overflow-hidden z-[200]">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-[hsl(220,7%,45%)] px-2.5 pt-2 pb-1">Commands</p>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.name); }}
          onMouseEnter={() => setActiveIndex(i)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
            i === activeIndex
              ? 'bg-primary/20 text-white'
              : 'text-[hsl(220,7%,75%)] hover:bg-[hsl(228,7%,22%)]'
          }`}
        >
          <span className="text-sm leading-none">{cmd.emoji}</span>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${i === activeIndex ? 'text-primary' : 'text-white'}`}>
              {cmd.name}
            </p>
            <p className="text-[10px] text-[hsl(220,7%,50%)] truncate">{cmd.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}