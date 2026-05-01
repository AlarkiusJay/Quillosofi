import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { app } from '@/api/localClient';
import { Plus, FileText, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEditorTabs } from '@/lib/editorTabs';
import TabStrip from '@/components/editors/TabStrip';
import CanvasEditor from '@/components/vault/CanvasEditor';

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

  // Sync the URL with the active tab.
  useEffect(() => {
    if (routeId && routeId !== activeId) {
      // Route says open this id — make sure it's a tab.
      openTab(routeId);
    } else if (!routeId && activeId) {
      // Route is /canvas but a tab is active — hop to it.
      navigate(`/canvas/${activeId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  useEffect(() => {
    if (activeId && activeId !== routeId) {
      navigate(`/canvas/${activeId}`, { replace: true });
    } else if (!activeId && routeId) {
      navigate('/canvas', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleNew = async () => {
    const c = await app.entities.Canvas.create({ title: 'Untitled Canvas', content: '' });
    setAllCanvases(prev => [c, ...prev]);
    setOpenCanvasMap(prev => ({ ...prev, [c.id]: c }));
    openTab(c.id);
  };

  const handleOpen = (id) => {
    openTab(id);
  };

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

  // Recent canvases for the landing screen — exclude already-open tabs to avoid noise.
  const recent = useMemo(() => {
    const openSet = new Set(tabs);
    return allCanvases.filter(c => !openSet.has(c.id)).slice(0, 12);
  }, [allCanvases, tabs]);

  const lastOpenCard = useMemo(() => {
    if (tabs.length > 0) return null; // Tab strip already covers this case.
    return allCanvases[0] || null;
  }, [allCanvases, tabs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(220,8%,13%)]">
      <TabStrip
        tabs={tabDescriptors}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={closeTab}
        onNew={handleNew}
        placeholder="No canvases open — pick one below or hit + to start fresh"
      />

      {activeCanvas ? (
        <CanvasEditor
          key={activeCanvas.id}
          canvas={activeCanvas}
          embedded
          onUpdate={handleUpdateCanvas}
        />
      ) : (
        <Landing
          loading={loading}
          lastOpenCard={lastOpenCard}
          recent={recent}
          onOpen={handleOpen}
          onNew={handleNew}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function Landing({ loading, lastOpenCard, recent, onOpen, onNew, navigate }) {
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
              {recent.map(c => (
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
                  <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)]">
                    <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                    <p className="text-[10px] text-[hsl(220,7%,40%)] mt-0.5">
                      {c.updated_date ? format(new Date(c.updated_date), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
