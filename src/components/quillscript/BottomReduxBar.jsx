// BottomReduxBar — v0.6.10-Alpha1
//
// Sticky bottom formatting bar for Quillscript. Hosts the formatting
// controls that used to live in CanvasEditor's top toolbar in v0.5.82
// — font size, B/I/U/S, alignment, indent, line height, lists, link,
// divider, ¶ Paragraph dialog launcher, and the View menu.
//
// The bar talks to the editor through the legacy quillRef adapter that
// CanvasEditor already maintains, so every command is identical to
// v0.5.82. The only visual change is the position (bottom, sticky) and
// the surface (chalkboard bar, sits inside the editor pane).
//
// Notion-style: subtle, always-visible, ignores scroll. Hovers over the
// editor surface with a soft backdrop blur.

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code, Link as LinkIcon, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, Type, MoreVertical, Heading2, ChevronDown, Pilcrow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ViewMenu from '@/components/vault/ViewMenu';

const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '32px', label: '32' },
  { value: '48px', label: '48' },
];
const LINE_HEIGHTS = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3.0' },
];

function TriggerWithMenu({ icon: Icon, title, items, onPick, Menu }) {
  const [show, setShow] = useState(false);
  const anchorRef = useRef(null);
  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); setShow((v) => !v); }}
        className="h-7 px-2 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)] transition-colors text-xs"
      >
        <Icon className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {show && (
        <Menu
          anchorRef={anchorRef}
          label={title}
          items={items}
          onPick={onPick}
          onClose={() => setShow(false)}
          openUpward
        />
      )}
    </div>
  );
}

export default function BottomReduxBar({
  quillRef,
  pageSetup,
  onPageSetupChange,
  onOpenPageSetupDialog,
  onOpenParagraphDialog,
}) {
  const [showHeadings, setShowHeadings] = useState(false);

  const fmt = useCallback((format, value) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    const current = q.getFormat?.();
    if (format === 'list' && current?.list === value) {
      q.format('list', false);
    } else {
      q.format(format, current?.[format] === value ? false : value);
    }
  }, [quillRef]);

  const setFmt = useCallback((format, value) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    q.format(format, value);
  }, [quillRef]);

  const adjustIndent = useCallback((delta) => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    q.focus();
    const current = parseInt(q.getFormat?.().indent || 0, 10);
    const next = Math.max(0, Math.min(8, current + delta));
    q.format('indent', next || false);
  }, [quillRef]);

  const Btn = ({ icon: Icon, title, onClick, active = false }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'h-7 w-7 rounded flex items-center justify-center transition-colors',
        active
          ? 'text-[hsl(var(--chalk-yellow))] bg-[hsl(var(--chalk-deep)/0.7)]'
          : 'text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.6)]'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-[hsl(var(--chalk-white-faint)/0.2)] mx-0.5" />;

  // Menu pops UPWARD from a bottom-anchored bar (the v0.5.82 toolbar
  // popped down because it sat at the top). align: 'left' = align to
  // anchor's left edge; openUpward shifts it above the trigger button.
  const Menu = ({ anchorRef, items, onPick, onClose, label, openUpward }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useLayoutEffect(() => {
      if (!anchorRef?.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const POPOVER_H = Math.min(items.length, 8) * 28 + 8;
      setPos({
        top: openUpward ? r.top - POPOVER_H - 4 : r.bottom + 4,
        left: r.left,
      });
    }, [anchorRef, items.length, openUpward]);
    return createPortal(
      <>
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />
        <div
          role="menu"
          aria-label={label}
          className="fixed bg-[hsl(var(--chalk-deep)/0.97)] border border-[hsl(var(--chalk-white-faint)/0.25)] rounded-lg shadow-2xl backdrop-blur-md p-1 min-w-[88px]"
          style={{ zIndex: 9999, top: pos.top, left: pos.left }}
        >
          {items.map((it) => (
            <button
              key={it.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(it.value); onClose(); }}
              className="w-full text-left px-3 py-1.5 text-xs rounded text-[hsl(220,7%,72%)] hover:bg-[hsl(var(--chalk-deep))] hover:text-[hsl(var(--chalk-yellow))] transition-colors font-mono"
            >
              {it.label}
            </button>
          ))}
        </div>
      </>,
      document.body,
    );
  };

  return (
    <div className="border-t border-[hsl(var(--chalk-white-faint)/0.15)] px-4 py-1.5 flex items-center gap-0.5 flex-wrap bg-[hsl(var(--chalk-deep)/0.85)] backdrop-blur-md shrink-0">
      <Btn icon={Heading2} title="Headings" onClick={() => setShowHeadings((v) => !v)} />

      <TriggerWithMenu icon={Type} title="Font size" items={FONT_SIZES} onPick={(v) => setFmt('size', v)} Menu={Menu} />

      <Divider />
      <Btn icon={Bold} title="Bold" onClick={() => fmt('bold', true)} />
      <Btn icon={Italic} title="Italic" onClick={() => fmt('italic', true)} />
      <Btn icon={Underline} title="Underline" onClick={() => fmt('underline', true)} />
      <Btn icon={Strikethrough} title="Strikethrough" onClick={() => fmt('strike', true)} />

      <Divider />
      <Btn icon={AlignLeft} title="Align left" onClick={() => setFmt('align', false)} />
      <Btn icon={AlignCenter} title="Align center" onClick={() => setFmt('align', 'center')} />
      <Btn icon={AlignRight} title="Align right" onClick={() => setFmt('align', 'right')} />
      <Btn icon={AlignJustify} title="Justify" onClick={() => setFmt('align', 'justify')} />

      <Divider />
      <Btn icon={IndentDecrease} title="Outdent (Shift-Tab)" onClick={() => adjustIndent(-1)} />
      <Btn icon={IndentIncrease} title="Indent (Tab)" onClick={() => adjustIndent(1)} />

      <Divider />
      <TriggerWithMenu icon={MoreVertical} title="Line spacing" items={LINE_HEIGHTS} onPick={(v) => setFmt('line-height', v)} Menu={Menu} />

      <Divider />
      <Btn icon={List} title="Bullet list" onClick={() => fmt('list', 'bullet')} />
      <Btn icon={ListOrdered} title="Numbered list" onClick={() => fmt('list', 'ordered')} />
      <Btn icon={Quote} title="Blockquote" onClick={() => fmt('blockquote', true)} />

      <Divider />
      <Btn icon={Code} title="Code block" onClick={() => fmt('code-block', true)} />
      <Btn icon={LinkIcon} title="Link" onClick={() => { const url = prompt('Enter URL:'); if (url) fmt('link', url); }} />
      <Btn icon={Minus} title="Divider" onClick={() => {
        const q = quillRef.current?.getEditor?.();
        if (!q) return;
        const range = q.getSelection?.(true);
        if (!range) return;
        q.insertText(range.index, '────────────────────────');
      }} />

      {/* v0.6.95-Alpha4 — ¶ + View menu moved to the top toolbar in CanvasEditor.
          Used to live here at the right edge of the redux bar, but the popover
          got clipped against the editor surface. The props are still received
          (onOpenParagraphDialog / onPageSetupChange / onOpenPageSetupDialog) but
          no longer wired to UI here — keeping the signature stable so callers
          don't need a sweep. */}

      {showHeadings && (
        <div className="flex items-center gap-1 w-full pt-1.5 flex-wrap">
          {[1, 2, 3].map((h) => (
            <button
              key={h}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fmt('header', h); setShowHeadings(false); }}
              className="px-2.5 py-0.5 text-xs rounded border border-[hsl(var(--chalk-white-faint)/0.2)] text-[hsl(220,7%,65%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors font-medium"
            >
              H{h}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); fmt('header', false); setShowHeadings(false); }}
            className="px-2.5 py-0.5 text-xs rounded border border-[hsl(var(--chalk-white-faint)/0.2)] text-[hsl(220,7%,65%)] hover:text-[hsl(var(--chalk-yellow))] hover:bg-[hsl(var(--chalk-deep)/0.7)] transition-colors font-medium"
          >
            Normal
          </button>
        </div>
      )}
    </div>
  );
}
