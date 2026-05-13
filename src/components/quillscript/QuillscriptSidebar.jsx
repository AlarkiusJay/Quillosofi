// QuillscriptSidebar — v0.6.10-Alpha1 → v0.6.65-Alpha2
//
// Notion-style left sidebar for the Quillscript hub. Two-level tree:
//   Section (Pinned / Space / Unsorted)
//     └─ Canvas (click to open, double-click to rename, drag to reorder)
//
// Alpha 2 additions:
//   • Drag-reorder within each section using @hello-pangea/dnd (already
//     installed for Quillounge card grid).
//   • Inline rename on double-click (Enter commits, Esc cancels).
//   • Cross-section sort-order is preserved in the canvas `sort_order`
//     field; same-section reordering bumps it.
//
// Sync rule (locked in by Alaria): "Sync between Quillibrary and
// Quillscript is its own sync thing, not part of Quillginate." So this
// sidebar always reflects the Canvas store directly — independent of
// whether Quillginate is active on the open canvas.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Pin, FileText, Plus, BookOpen } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import InlineRename from './InlineRename';

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
  onRename,
  onReorder,
  onOpenQuillibrary,
}) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const toggleSection = useCallback((key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  const openTabSet = useMemo(() => new Set(openTabIds), [openTabIds]);

  // Bucket canvases: Pinned (across all spaces) → per-Space groups → Unsorted.
  // Within each bucket: sort by sort_order ASC (nullish last), then by
  // -updated_date (most-recent first) as tiebreaker.
  const { pinned, bySpace, unsorted } = useMemo(() => {
    const cmp = (a, b) => {
      const ao = a.sort_order ?? Number.POSITIVE_INFINITY;
      const bo = b.sort_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      const at = new Date(a.updated_date || 0).getTime();
      const bt = new Date(b.updated_date || 0).getTime();
      return bt - at;
    };
    const pinned = [];
    const bySpace = new Map();
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
    pinned.sort(cmp);
    unsorted.sort(cmp);
    for (const list of bySpace.values()) list.sort(cmp);
    return { pinned, bySpace, unsorted };
  }, [canvases]);

  const beginRename = useCallback((c) => {
    setRenamingId(c.id);
    setRenameDraft(c.title || 'Untitled Canvas');
  }, []);

  const commitRename = useCallback((nextTitle) => {
    if (renamingId) {
      const trimmed = (nextTitle || '').trim() || 'Untitled Canvas';
      onRename?.(renamingId, trimmed);
    }
    setRenamingId(null);
    setRenameDraft('');
  }, [renamingId, onRename]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameDraft('');
  }, []);

  // Drag-end handler. We use a per-section droppableId so drags don't
  // cross sections (matching Notion). Reorder writes new sort_order
  // values for the affected section's canvases via the bus.
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const { source, destination, draggableId, type } = result;
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    // Resolve the section's canvas list.
    const sectionId = source.droppableId;
    let list;
    if (sectionId === 'pinned') list = pinned;
    else if (sectionId === 'unsorted') list = unsorted;
    else if (sectionId.startsWith('space:')) list = bySpace.get(sectionId.slice('space:'.length)) || [];
    else return;

    const reordered = Array.from(list);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onReorder?.(reordered.map((c) => c.id));
  }, [pinned, unsorted, bySpace, onReorder]);

  const renderCanvas = (c, dragHandleProps = {}) => {
    const isActive = c.id === activeId;
    const isOpen = openTabSet.has(c.id);
    const isRenaming = renamingId === c.id;
    if (isRenaming) {
      return (
        <div
          className={cn(
            'group w-full flex items-center gap-1.5 px-2 py-1 rounded',
            'bg-[hsl(var(--chalk-deep)/0.5)]',
          )}
        >
          <span className="text-sm leading-none shrink-0">{c.emoji || '📄'}</span>
          <InlineRename
            value={renameDraft}
            onChange={setRenameDraft}
            onCommit={commitRename}
            onCancel={cancelRename}
            className="flex-1 text-xs bg-transparent text-white outline-none border-b border-primary/50 py-0.5"
          />
        </div>
      );
    }
    return (
      <div
        {...dragHandleProps}
        onClick={() => onOpen?.(c.id)}
        onDoubleClick={(e) => { e.preventDefault(); beginRename(c); }}
        className={cn(
          'group w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left cursor-pointer transition-colors',
          isActive
            ? 'bg-[hsl(var(--chalk-deep)/0.7)] text-white'
            : 'text-[hsl(220,7%,68%)] hover:bg-[hsl(var(--chalk-deep)/0.45)] hover:text-white',
        )}
        title={`${c.title || 'Untitled'} — double-click to rename`}
      >
        <span className="text-sm leading-none shrink-0">{c.emoji || '📄'}</span>
        <span className="truncate flex-1">{c.title || 'Untitled'}</span>
        {isOpen && !isActive && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" title="Open in a tab" />
        )}
      </div>
    );
  };

  const DraggableSection = ({ id, items }) => (
    <Droppable droppableId={id}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-0.5">
          {items.map((c, idx) => (
            <Draggable key={c.id} draggableId={c.id} index={idx}>
              {(prov, snapshot) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  {...prov.dragHandleProps}
                  style={{
                    ...prov.draggableProps.style,
                    opacity: snapshot.isDragging ? 0.85 : 1,
                  }}
                >
                  {renderCanvas(c)}
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  const Section = ({ id, icon: Icon, label, items, count, accent }) => {
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
        {!isCollapsed && (
          <div className="mt-0.5 pl-3">
            <DraggableSection id={id} items={items} />
          </div>
        )}
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
        <DragDropContext onDragEnd={handleDragEnd}>
          {pinned.length > 0 && (
            <Section
              id="pinned"
              icon={Pin}
              label="Pinned"
              count={pinned.length}
              accent="text-[hsl(var(--chalk-yellow))]"
              items={pinned}
            />
          )}

          {Array.from(bySpace.entries()).map(([spaceName, list]) => (
            <Section
              key={`space:${spaceName}`}
              id={`space:${spaceName}`}
              label={spaceName}
              count={list.length}
              items={list}
            />
          ))}

          {unsorted.length > 0 && (
            <Section
              id="unsorted"
              label="Unsorted"
              count={unsorted.length}
              items={unsorted}
            />
          )}
        </DragDropContext>

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
