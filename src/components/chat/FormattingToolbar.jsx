import { useState } from 'react';
import { Bold, Italic, Strikethrough, Code, Link, List, ListOrdered, Quote, Minus, Table, Palette, Heading2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const HEADERS = [
  { level: 1, title: 'H1', prefix: '# ' },
  { level: 2, title: 'H2', prefix: '## ' },
  { level: 3, title: 'H3', prefix: '### ' },
  { level: 4, title: 'H4', prefix: '#### ' },
  { level: 10, title: 'H10', prefix: '<small>', suffix: '</small>' },
];

const TOOLS = [
  { icon: Bold,          title: 'Bold',          prefix: '**', suffix: '**',  block: false },
  { icon: Italic,        title: 'Italic',         prefix: '_',  suffix: '_',   block: false },
  { icon: Strikethrough, title: 'Strikethrough',  prefix: '~~', suffix: '~~',  block: false },
  { icon: Code,          title: 'Inline code',    prefix: '`',  suffix: '`',   block: false },
  { divider: true },
  { icon: List,          title: 'Bullet list',    insert: '\n- Item 1\n- Item 2\n- Item 3', block: true },
  { icon: ListOrdered,   title: 'Numbered list',  insert: '\n1. Item 1\n2. Item 2\n3. Item 3', block: true },
  { icon: Quote,         title: 'Blockquote',     insert: '\n> Quote text', block: true },
  { icon: Minus,         title: 'Divider',        insert: '<hr>', block: true },
  { divider: true },
  { icon: Link,          title: 'Link',           prefix: '[', suffix: '](url)', block: false },
  { icon: Table,         title: 'Table',          insert: '\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', block: true },
  {                      title: 'Code block',     label: '</>',  insert: '\n```\ncode here\n```\n', block: true },
];

const PRESET_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#ffffff'];

export default function FormattingToolbar({ textareaRef, value, onChange }) {
  const [colorInput, setColorInput] = useState('#ef4444');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const applyColor = (hex) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'text';
    const wrapped = `<span style="color:${hex}">${selected}</span>`;
    const newVal = value.slice(0, start) + wrapped + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + wrapped.length, start + wrapped.length); });
    setShowColorPicker(false);
  };

  const applyFormat = (tool) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let newVal, newCursor;

    if (tool.insert) {
      newVal = value.slice(0, start) + tool.insert + value.slice(end);
      newCursor = start + tool.insert.length;
    } else {
      const wrapped = `${tool.prefix}${selected || 'text'}${tool.suffix}`;
      newVal = value.slice(0, start) + wrapped + value.slice(end);
      newCursor = selected ? start + wrapped.length : start + tool.prefix.length;
    }

    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  };

  const applyHeader = (header) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'Header text';
    const newVal = value.slice(0, start) + header.prefix + selected + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + header.prefix.length + selected.length, start + header.prefix.length + selected.length);
    });
    setShowHeaderMenu(false);
  };

  return (
    <div>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[hsl(225,9%,15%)] flex-wrap relative">
        <button
          type="button"
          title="Headers"
          onClick={() => setShowHeaderMenu(v => !v)}
          className="h-6 min-w-6 px-1 rounded text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-xs font-mono flex items-center justify-center gap-0.5"
        >
          <Heading2 className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </button>
        <div className="w-px h-4 bg-[hsl(225,9%,22%)] mx-1" />
        {TOOLS.map((tool, i) => {
          if (tool.divider) return <div key={i} className="w-px h-4 bg-[hsl(225,9%,22%)] mx-1" />;
          const Icon = tool.icon;
          return (
            <button
              key={i}
              type="button"
              title={tool.title}
              onClick={() => applyFormat(tool)}
              className={cn(
                "h-6 min-w-6 px-1 rounded text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-xs font-mono flex items-center justify-center"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : tool.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-4 bg-[hsl(225,9%,22%)] mx-1" />

        {/* Color picker toggle button */}
        <button
          type="button"
          title="Text color"
          onClick={() => setShowColorPicker(v => !v)}
          className="h-6 w-6 rounded hover:bg-[hsl(228,7%,30%)] transition-colors flex items-center justify-center"
        >
          <div className="relative">
            <Palette className="h-3.5 w-3.5 text-[hsl(220,7%,55%)]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[hsl(228,8%,27%)]" style={{ background: colorInput }} />
          </div>
        </button>
      </div>

      {/* Header menu — collapsible bar below the toolbar */}
      {showHeaderMenu && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[hsl(225,9%,15%)] flex-wrap">
          {HEADERS.map(h => (
            <button
              key={h.level}
              type="button"
              onClick={() => applyHeader(h)}
              className="px-2.5 py-1 text-xs rounded border border-[hsl(225,9%,15%)] text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors font-medium"
            >
              {h.title}
            </button>
          ))}
        </div>
      )}

      {/* Color picker — collapsible bar below the toolbar */}
      {showColorPicker && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(225,9%,15%)] flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setColorInput(c); applyColor(c); }}
                className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white/50 transition-all"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-5 h-5 rounded shrink-0 border border-[hsl(225,9%,22%)]" style={{ background: colorInput }} />
            <input
              type="text"
              value={colorInput}
              onChange={e => setColorInput(e.target.value)}
              maxLength={7}
              placeholder="#000000"
              className="flex-1 min-w-0 bg-[hsl(228,8%,27%)] text-white text-xs px-2 py-1 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary border border-[hsl(225,9%,15%)]"
            />
            <button
              type="button"
              onClick={() => applyColor(colorInput)}
              className="text-xs px-2 py-1 rounded bg-primary text-white hover:bg-primary/90 transition-colors font-medium shrink-0"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}