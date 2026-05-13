import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { app } from '@/api/localClient';
import { Plus, FileText, Clock, BookOpen, Home } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEditorTabs } from '@/lib/editorTabs';
import TabStrip from '@/components/editors/TabStrip';
import CanvasEditor from '@/components/vault/CanvasEditor';
// v0.6.10-Alpha1 — Notion-style left sidebar for Quillscript
import QuillscriptSidebar from '@/components/quillscript/QuillscriptSidebar';
// v0.6.65-Alpha2 — tri-hub sync ring + sort-order persistence
import { emitCanvasChange, subscribeCanvasBus } from '@/lib/canvasBus';

// CanvasEditorHub — full-page editor hub for canvases.
//   /canvas         → landing (Resume Last + Recent grid + New Blank)
//   /canvas/:id     → editor (with tab strip across the top)
//
// Tabs persist via quillosofi:canvas:openTabs / quillosofi:canvas:lastOpen.
// Quillibrary remains the storage browser; "Open in Editor" routes here.
export default function CanvasEditorHub() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { tabs, activeId, openTab, closeTab, setActiveId, pruneTabs } = useEditorTabs('canvas');
  const [allCanvases, setAllCanvases] = useState([]);
  const [openCanvasMap, setOpenCanvasMap] = useState({}); // id → full canvas object
  const [loading, setLoading] = useState(true);

  // Initial load — fetch all canvases for the landing grid + tab title resolution.
  const reload = useCallback(async () => {
    setLoading(true);
    const data = await app.entities.Canvas.list('-updated_date', 200);
    setAllCanvases(data);
    const map = Object.fromEntries(data.map(c => [c.id, c]));
    setOpenCanvasMap(prev => ({ ...prev, ...map }));
    pruneTabs(data.map(c => c.id));
    setLoading(false);
  }, [pruneTabs]);

  useEffect(() => { reload(); }, [reload]);

  // v0.6.65-Alpha2 — Hub is the sidebar's data source. Listen to the bus
  // so renames, emoji changes, pins, drag-reorder, etc. surface live.
  // Debounced to coalesce bursts of save events from active typing.
  useEffect(() => {
    let pending = false;
    const unsub = subscribeCanvasBus(() => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; reload(); }, 150);
    });
    return unsub;
  }, [reload]);

  // Sync URL ↔ active tab.
  //
  // v0.5.0 bug (fixed in v0.5.1): the prior version treated `routeId` as the
  // unconditional source of truth, so clicking a tab — which sets activeId to
  // the new id but leaves the URL on the old one — caused this effect to run
  // `openTab(routeId)` and snap the active tab back. Tab switching looked
  // frozen.
  //
  // New rule: routeId only seeds activeId on the *first* mount (so deep links
  // like /canvas/:id and Quillibrary "Open in Editor" still work). After that,
  // activeId is the source of truth and the URL follows it.
  const didInitialSync = useRef(false);
  useEffect(() => {
    if (!didInitialSync.current) {
      didInitialSync.current = true;
      if (routeId && routeId !== activeId) {
        openTab(routeId); // deep link or stale lastOpen — adopt URL once
        return;
      }
      if (!routeId && activeId) {
        navigate(`/canvas/${activeId}`, { replace: true });
        return;
      }
      return;
    }
    // Post-mount: activeId wins. Push the URL to match it.
    if (activeId && routeId !== activeId) {
      navigate(`/canvas/${activeId}`, { replace: true });
    } else if (!activeId && routeId) {
      navigate('/canvas', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, activeId]);

  const handleNew = async () => {
    const c = await app.entities.Canvas.create({ title: 'Untitled Canvas', content: '' });
    setAllCanvases(prev => [c, ...prev]);
    setOpenCanvasMap(prev => ({ ...prev, [c.id]: c }));
    emitCanvasChange('created', { id: c.id, canvas: c });
    openTab(c.id);
  };

  // v0.6.65-Alpha2 — sidebar drag-reorder writes sort_order patches
  // through the bus. The order map is also persisted to localStorage so
  // the sidebar can apply it before Canvas.update round-trips return.
  const handleReorder = useCallback(async (orderedIds) => {
    // Write sort_order to each canvas. Lower = higher in list.
    const updates = orderedIds.map((id, idx) =>
      app.entities.Canvas.update(id, { sort_order: idx }).catch(() => null)
    );
    await Promise.all(updates);
    emitCanvasChange('reordered', { ids: orderedIds });
  }, []);

  // v0.6.65-Alpha2 — sidebar inline rename. Saves through the bus so
  // every consumer (Quillibrary, Quillounge, Recents picker) sees it.
  const handleRename = useCallback(async (id, nextTitle) => {
    const trimmed = (nextTitle || '').trim() || 'Untitled Canvas';
    setAllCanvases(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c));
    setOpenCanvasMap(prev => prev[id] ? { ...prev, [id]: { ...prev[id], title: trimmed } } : prev);
    const updated = await app.entities.Canvas.update(id, { title: trimmed });
    emitCanvasChange('updated', { id, patch: { title: trimmed }, canvas: updated });
  }, []);

  const handleOpen = (id) => {
    openTab(id);
  };

  // Close a tab AND keep the URL in sync. Without this the route-precedence
  // sync effect would reopen the just-closed tab because the URL still
  // references its id. (Bug surfaced after v0.4.35: closing the active or
  // only tab made it pop right back.)
  const handleCloseTab = useCallback((id) => {
    const idx = tabs.indexOf(id);
    const next = tabs.filter(t => t !== id);
    closeTab(id);
    // If we closed the tab whose id is in the URL, hop the URL.
    if (id === routeId) {
      const fallback = next[idx] || next[idx - 1] || null;
      navigate(fallback ? `/canvas/${fallback}` : '/canvas', { replace: true });
    }
  }, [tabs, routeId, closeTab, navigate]);

  const handleUpdateCanvas = (updated) => {
    if (!updated?.id) return;
    setAllCanvases(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setOpenCanvasMap(prev => ({ ...prev, [updated.id]: { ...(prev[updated.id] || {}), ...updated } }));
  };

  const tabDescriptors = useMemo(() => tabs.map(id => {
    const c = openCanvasMap[id] || allCanvases.find(x => x.id === id);
    return { id, title: c?.title || 'Untitled', icon: '📄' };
  }), [tabs, openCanvasMap, allCanvases]);

  const activeCanvas = activeId ? (openCanvasMap[activeId] || allCanvases.find(c => c.id === activeId)) : null;

  // Recent canvases for the landing screen.
  //
  // v0.5.1 fix: previously this filtered out any canvas already in an open
  // tab, which made the Hub landing page show "No canvases yet" the moment
  // you had everything open — including freshly-created canvases that always
  // open as tabs. We now show all canvases and just mark the open ones with
  // a subtle badge.
  const recent = useMemo(() => allCanvases.slice(0, 12), [allCanvases]);
  const openTabSet = useMemo(() => new Set(tabs), [tabs]);

  const lastOpenCard = useMemo(() => {
    if (tabs.length > 0) return null; // Tab strip already covers this case.
    return allCanvases[0] || null;
  }, [allCanvases, tabs]);

  // v0.5.0 — "Canvas Hub" home button. Drops you back to the landing screen
  // (/canvas, no :id) without closing your open tabs. Alaria's ask:
  // "we don't have a way to get back into the Canvas Hub".
  // We clear activeId first so the route-sync effect doesn't bounce us back
  // into the previously-open canvas.
  const goHome = useCallback(() => {
    setActiveId(null);
    navigate('/canvas');
  }, [navigate, setActiveId]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[hsl(220,8%,13%)]">
      {/* v0.6.10-Alpha1 — Notion-style left sidebar. Persistent across
          canvases (not per-tab), shows pinned + spaces + unsorted. */}
      <QuillscriptSidebar
        canvases={allCanvases}
        activeId={activeId}
        openTabIds={tabs}
        onOpen={handleOpen}
        onNew={handleNew}
        onRename={handleRename}
        onReorder={handleReorder}
        onOpenQuillibrary={() => navigate('/quillibrary')}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-stretch border-b border-[hsl(225,9%,14%)] bg-[hsl(220,8%,14%)] shrink-0">
          <button
            onClick={goHome}
            title="Quillscript Hub"
            className="px-3 flex items-center gap-1.5 text-[11px] font-medium text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,22%)] transition-colors border-r border-[hsl(225,9%,14%)] shrink-0"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="font-mono uppercase tracking-wider">Quillscript</span>
          </button>
          <div className="flex-1 min-w-0">
            <TabStrip
              tabs={tabDescriptors}
              activeId={activeId}
              onSelect={setActiveId}
              onClose={handleCloseTab}
              onNew={handleNew}
              placeholder="No canvases open — pick one from the sidebar or hit + to start fresh"
            />
          </div>
        </div>

        {activeCanvas ? (
          <CanvasEditor
            key={activeCanvas.id}
            canvas={activeCanvas}
            embedded
            onUpdate={handleUpdateCanvas}
            onHome={goHome}
            onOpenCanvas={handleOpen}
          />
        ) : (
          <Landing
            loading={loading}
            lastOpenCard={lastOpenCard}
            recent={recent}
            openTabSet={openTabSet}
            onOpen={handleOpen}
            onNew={handleNew}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

function Landing({ loading, lastOpenCard, recent, openTabSet, onOpen, onNew, navigate }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-white">Canvas</h1>
          </div>
          <p className="text-xs text-[hsl(220,7%,55%)]">Long-form writing — pick up where you left off, or start something new.</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            onClick={onNew}
            className="group flex items-center gap-3 px-5 py-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 hover:border-primary/50 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">New Blank Canvas</p>
              <p className="text-[11px] text-[hsl(220,7%,55%)]">Empty page, ready to write.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/quillibrary')}
            className="group flex items-center gap-3 px-5 py-4 rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] hover:bg-[hsl(228,7%,20%)] hover:border-[hsl(225,9%,30%)] transition-all text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-[hsl(228,7%,22%)] flex items-center justify-center text-[hsl(220,7%,70%)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Open from Quillibrary</p>
              <p className="text-[11px] text-[hsl(220,7%,55%)]">Browse your full library.</p>
            </div>
          </button>
        </div>

        {/* Resume last */}
        {lastOpenCard && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[hsl(220,7%,50%)]" />
              <span className="text-[11px] font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider">Resume Last</span>
            </div>
            <button
              onClick={() => onOpen(lastOpenCard.id)}
              className="w-full text-left rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] hover:bg-[hsl(228,7%,20%)] hover:border-primary/40 transition-all overflow-hidden"
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>📄</span>
                  <p className="text-sm font-semibold text-white truncate">{lastOpenCard.title}</p>
                </div>
                <p className="text-[11px] text-[hsl(220,7%,55%)]">
                  Last edited {lastOpenCard.updated_date ? format(new Date(lastOpenCard.updated_date), 'MMM d, yyyy') : 'recently'}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Recent grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider">Recent</span>
            {recent.length > 0 && (
              <button onClick={() => navigate('/quillibrary')} className="text-[11px] text-primary hover:text-primary/80 transition-colors">View all →</button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(225,9%,22%)] py-12 text-center">
              <span className="text-3xl mb-2 block">📄</span>
              <p className="text-sm text-white mb-1">No canvases yet</p>
              <p className="text-xs text-[hsl(220,7%,50%)]">Start with a blank page above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map(c => {
                const isOpen = openTabSet?.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onOpen(c.id)}
                    className={cn(
                      'group rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)]',
                      'hover:bg-[hsl(228,7%,20%)] hover:border-primary/40 transition-all overflow-hidden text-left'
                    )}
                  >
                    <div className="px-4 py-4 min-h-[110px]">
                      <p className="text-xs text-[hsl(220,7%,50%)] leading-relaxed line-clamp-4">
                        {(c.content || '').replace(/<[^>]+>/g, '').trim() || <span className="italic">Empty canvas</span>}
                      </p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)] flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                        <p className="text-[10px] text-[hsl(220,7%,40%)] mt-0.5">
                          {c.updated_date ? format(new Date(c.updated_date), 'MMM d, yyyy') : ''}
                        </p>
                      </div>
                      {isOpen && (
                        <span
                          className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 bg-primary/10"
                          title="Already open in a tab"
                        >
                          Open
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
