// QuillscriptSidebar — v0.6.10-Alpha1
//
// Notion-style left sidebar for the Quillscript hub. Two-level tree:
//   Section (Pinned / Space / Unsorted)
//     └─ Canvas (click to open)
//
// Drag-reorder, rename, and create-from-tree are deferred to Alpha 2 to
// keep this slice landable. For Alpha 1 the sidebar focuses on:
//   • making the user's existing canvases discoverable without leaving
//     the editor
//   • respecting Space hierarchy (canvases group by space_name)
//   • marking the active canvas + any already-open tabs
//   • collapsible per-section, persisted in localStorage
//
// Sync rule (locked in by Alaria): "Sync between Quillibrary and
// Quillscript is its own sync thing, not part of Quillginate." So this
// sidebar always reflects the Canvas store directly — independent of
// whether Quillginate is active on the open canvas.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Pin, FileText, Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLLAPSE_KEY = 'quillosofi:quillscript:sidebar:collapsed:v1';

function loadCollapsed() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}
function saveCollapsed(map) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

export default function QuillscriptSidebar({
  canvases = [],
  activeId,
  openTabIds = [],
  onOpen,
  onNew,
  onOpenQuillibrary,
}) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  const toggleSection = useCallback((key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  const openTabSet = useMemo(() => new Set(openTabIds), [openTabIds]);

  // Bucket canvases: Pinned (across all spaces) → per-Space groups → Unsorted.
  const { pinned, bySpace, unsorted } = useMemo(() => {
    const pinned = [];
    const bySpace = new Map(); // space_name → [canvas...]
    const unsorted = [];
    for (const c of canvases) {
      if (c.is_pinned) pinned.push(c);
      if (c.space_name) {
        if (!bySpace.has(c.space_name)) bySpace.set(c.space_name, []);
        bySpace.get(c.space_name).push(c);
      } else {
        unsorted.push(c);
      }
    }
    return { pinned, bySpace, unsorted };
  }, [canvases]);

  const renderCanvas = (c) => {
    const isActive = c.id === activeId;
    const isOpen = openTabSet.has(c.id);
    return (
      <button
        key={c.id}
        onClick={() => onOpen?.(c.id)}
        className={cn(
          'group w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors',
          isActive
            ? 'bg-[hsl(var(--chalk-deep)/0.7)] text-white'
            : 'text-[hsl(220,7%,68%)] hover:bg-[hsl(var(--chalk-deep)/0.45)] hover:text-white',
        )}
        title={c.title || 'Untitled'}
      >
        <span className="text-sm leading-none shrink-0">{c.emoji || '📄'}</span>
        <span className="truncate flex-1">{c.title || 'Untitled'}</span>
        {isOpen && !isActive && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" title="Open in a tab" />
        )}
      </button>
    );
  };

  const Section = ({ id, icon: Icon, label, children, count, accent }) => {
    const isCollapsed = !!collapsed[id];
    return (
      <div className="mb-2">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[hsl(220,7%,50%)] hover:text-white transition-colors"
        >
          {isCollapsed
            ? <ChevronRight className="h-3 w-3 shrink-0" />
            : <ChevronDown className="h-3 w-3 shrink-0" />}
          {Icon && <Icon className={cn('h-3 w-3 shrink-0', accent || '')} />}
          <span className="truncate flex-1 text-left">{label}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="text-[9px] text-[hsl(220,7%,38%)] tabular-nums">{count}</span>
          )}
        </button>
        {!isCollapsed && <div className="mt-0.5 pl-3 space-y-0.5">{children}</div>}
      </div>
    );
  };

  return (
    <aside className="w-60 shrink-0 h-full overflow-hidden flex flex-col border-r border-[hsl(225,9%,18%)] bg-[hsl(220,8%,14%)]">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[hsl(225,9%,18%)]">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" /> Quillscript
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenQuillibrary}
            title="Open Quillibrary"
            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(var(--chalk-deep)/0.5)] transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onNew}
            title="New canvas"
            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 spacerail-scroll">
        {pinned.length > 0 && (
          <Section id="pinned" icon={Pin} label="Pinned" count={pinned.length} accent="text-[hsl(var(--chalk-yellow))]">
            {pinned.map(renderCanvas)}
          </Section>
        )}

        {Array.from(bySpace.entries()).map(([spaceName, list]) => (
          <Section key={`space:${spaceName}`} id={`space:${spaceName}`} label={spaceName} count={list.length}>
            {list.map(renderCanvas)}
          </Section>
        ))}

        {unsorted.length > 0 && (
          <Section id="unsorted" label="Unsorted" count={unsorted.length}>
            {unsorted.map(renderCanvas)}
          </Section>
        )}

        {canvases.length === 0 && (
          <div className="px-3 py-6 text-center">
            <span className="text-2xl mb-1 block">📄</span>
            <p className="text-[11px] text-[hsl(220,7%,55%)]">No canvases yet</p>
            <button
              onClick={onNew}
              className="mt-2 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              Start writing →
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
