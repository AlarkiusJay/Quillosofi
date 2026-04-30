import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, LayoutGrid, List, Table, Image, Star, Pin, Trash2, Plus, ChevronDown, SortAsc } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import CanvasEditor from './CanvasEditor';

const SORT_OPTIONS = [
  { id: 'updated_desc', label: 'Last Edited' },
  { id: 'created_desc', label: 'Date Created' },
  { id: 'name_asc', label: 'Name (A–Z)' },
  { id: 'name_desc', label: 'Name (Z–A)' },
  { id: 'space', label: 'Space' },
];

const VIEWS = [
  { id: 'grid', icon: LayoutGrid, label: 'Grid' },
  { id: 'gallery', icon: Image, label: 'Gallery' },
  { id: 'list', icon: List, label: 'List' },
  { id: 'details', icon: Table, label: 'Details' },
];

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

function CanvasCard({ canvas, view, onOpen, onTogglePin, onToggleFavorite, onDelete, pinnedCount }) {
  const snippet = stripHtml(canvas.content).slice(0, view === 'gallery' ? 200 : 80);
  const date = canvas.updated_date ? format(new Date(canvas.updated_date), 'MMM d, yyyy') : '';
  const canPin = !canvas.is_pinned && pinnedCount >= 7;

  if (view === 'details') {
    return (
      <div className="group flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(225,9%,14%)] hover:bg-[hsl(228,7%,22%)] cursor-pointer transition-colors" onClick={() => onOpen(canvas)}>
        <span className="text-base shrink-0">📄</span>
        <span className="flex-1 text-sm text-white font-medium truncate">{canvas.title}</span>
        {canvas.space_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">{canvas.space_name}</span>}
        <span className="text-xs text-[hsl(220,7%,45%)] shrink-0 w-28 text-right">{date}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(canvas); }} className={cn("h-6 w-6 rounded flex items-center justify-center transition-colors", canvas.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,45%)] hover:text-yellow-400")}>
            <Star className="h-3.5 w-3.5" fill={canvas.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (!canPin) onTogglePin(canvas); }} className={cn("h-6 w-6 rounded flex items-center justify-center transition-colors", canvas.is_pinned ? "text-primary" : canPin ? "text-[hsl(220,7%,30%)] cursor-not-allowed" : "text-[hsl(220,7%,45%)] hover:text-primary")}>
            <Pin className="h-3.5 w-3.5" fill={canvas.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(canvas); }} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(228,7%,22%)] cursor-pointer transition-colors" onClick={() => onOpen(canvas)}>
        <span className="text-base shrink-0">📄</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{canvas.title}</p>
          {snippet && <p className="text-xs text-[hsl(220,7%,45%)] truncate mt-0.5">{snippet}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canvas.is_favorite && <Star className="h-3 w-3 text-yellow-400" fill="currentColor" />}
          {canvas.is_pinned && <Pin className="h-3 w-3 text-primary" fill="currentColor" />}
          <span className="text-[10px] text-[hsl(220,7%,40%)]">{date}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(canvas); }} className={cn("h-5 w-5 rounded flex items-center justify-center", canvas.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,45%)] hover:text-yellow-400")}>
              <Star className="h-3 w-3" fill={canvas.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(canvas); }} className="h-5 w-5 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isGallery = view === 'gallery';
  return (
    <div className="group relative rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,16%)] hover:border-primary/40 hover:bg-[hsl(228,7%,20%)] cursor-pointer transition-all overflow-hidden" onClick={() => onOpen(canvas)}>
      <div className={cn("p-4", isGallery ? "min-h-[140px]" : "min-h-[80px]")}>
        <p className="text-xs text-[hsl(220,7%,50%)] leading-relaxed line-clamp-5">{snippet || <span className="italic">Empty canvas</span>}</p>
      </div>
      <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)] flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{canvas.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {canvas.space_name && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{canvas.space_name}</span>}
            <span className="text-[10px] text-[hsl(220,7%,40%)]">{date}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          {canvas.is_favorite && <Star className="h-3 w-3 text-yellow-400 shrink-0" fill="currentColor" />}
          {canvas.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" fill="currentColor" />}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(canvas); }} className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors", canvas.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,55%)] hover:text-yellow-400")}>
          <Star className="h-3 w-3" fill={canvas.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (!canPin) onTogglePin(canvas); }} title={canPin ? 'Max 7 pins reached' : canvas.is_pinned ? 'Unpin' : 'Pin'} className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors", canvas.is_pinned ? "text-primary" : canPin ? "text-[hsl(220,7%,30%)] cursor-not-allowed" : "text-[hsl(220,7%,55%)] hover:text-primary")}>
          <Pin className="h-3 w-3" fill={canvas.is_pinned ? 'currentColor' : 'none'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(canvas); }} className="h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] text-[hsl(220,7%,55%)] hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function CanvasList({ filter, spaces }) {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [showSort, setShowSort] = useState(false);
  const [search, setSearch] = useState('');
  const [openCanvas, setOpenCanvas] = useState(null);

  const load = async () => {
    setLoading(true);
    const [data, messages] = await Promise.all([
      base44.entities.Canvas.list('-updated_date', 200),
      base44.entities.Message.filter({ role: 'user' }, '-created_date', 500),
    ]);
    const messagesWithCanvas = messages.filter(m => m.canvas_content && m.canvas_content.trim());
    const existingMessageIds = new Set(data.map(c => c.message_id).filter(Boolean));
    const toImport = messagesWithCanvas.filter(m => !existingMessageIds.has(m.id));
    const newCanvases = await Promise.all(
      toImport.map(m => base44.entities.Canvas.create({
        title: m.canvas_title || 'Untitled Canvas',
        content: m.canvas_content,
        message_id: m.id,
        conversation_id: m.conversation_id || '',
      }))
    );
    const all = [...data, ...newCanvases];
    all.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
    setCanvases(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pinnedCount = canvases.filter(c => c.is_pinned).length;

  const handleCreate = async () => {
    const c = await base44.entities.Canvas.create({ title: 'Untitled Canvas', content: '' });
    setCanvases(prev => [c, ...prev]);
    setOpenCanvas(c);
  };

  const handleUpdate = (updated) => {
    setCanvases(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    if (openCanvas?.id === updated.id) setOpenCanvas(prev => ({ ...prev, ...updated }));
  };

  const handleTogglePin = async (canvas) => {
    const next = !canvas.is_pinned;
    if (next && pinnedCount >= 7) return;
    setCanvases(prev => prev.map(c => c.id === canvas.id ? { ...c, is_pinned: next } : c));
    await base44.entities.Canvas.update(canvas.id, { is_pinned: next });
  };

  const handleToggleFavorite = async (canvas) => {
    const next = !canvas.is_favorite;
    setCanvases(prev => prev.map(c => c.id === canvas.id ? { ...c, is_favorite: next } : c));
    await base44.entities.Canvas.update(canvas.id, { is_favorite: next });
  };

  const handleDelete = async (canvas) => {
    if (!confirm(`Delete "${canvas.title}"?`)) return;
    setCanvases(prev => prev.filter(c => c.id !== canvas.id));
    await base44.entities.Canvas.delete(canvas.id);
  };

  const filtered = useMemo(() => {
    let result = [...canvases];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.title?.toLowerCase().includes(q) || stripHtml(c.content).toLowerCase().includes(q));
    }
    if (filter === 'favorites') result = result.filter(c => c.is_favorite);
    else if (filter === 'pinned') result = result.filter(c => c.is_pinned);
    else if (filter?.startsWith('space:')) {
      const sid = filter.replace('space:', '');
      result = result.filter(c => c.space_id === sid);
    }
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
      if (sortBy === 'created_desc') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'space') return (a.space_name || '').localeCompare(b.space_name || '');
      return new Date(b.updated_date) - new Date(a.updated_date);
    });
    const pinned = result.filter(c => c.is_pinned);
    const rest = result.filter(c => !c.is_pinned);
    return [...pinned, ...rest];
  }, [canvases, search, filter, sortBy]);

  const pinnedItems = filtered.filter(c => c.is_pinned);
  const unpinnedItems = filtered.filter(c => !c.is_pinned);

  const gridClass = view === 'gallery'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : view === 'grid'
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
    : view === 'list'
    ? 'flex flex-col gap-0.5'
    : '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(225,9%,14%)] shrink-0 bg-[hsl(220,8%,17%)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(220,7%,40%)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search canvases..."
            className="w-full bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button onClick={() => setShowSort(v => !v)} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] text-xs text-[hsl(220,7%,60%)] hover:text-white transition-colors">
              <SortAsc className="h-3.5 w-3.5" />
              {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            <button onClick={() => setShowSort(v => !v)} className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] text-[hsl(220,7%,60%)] hover:text-white transition-colors">
              <SortAsc className="h-3.5 w-3.5" />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-9 z-50 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-xl shadow-2xl p-1 min-w-40">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                      className={cn('w-full text-left px-3 py-2 text-xs rounded-lg transition-colors', sortBy === opt.id ? 'bg-primary/15 text-primary' : 'text-[hsl(220,7%,65%)] hover:bg-[hsl(228,7%,25%)] hover:text-white')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-0.5 bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] rounded-lg p-0.5">
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} title={v.label}
                className={cn('h-6 w-6 rounded-md flex items-center justify-center transition-colors', view === v.id ? 'bg-primary text-white' : 'text-[hsl(220,7%,50%)] hover:text-white')}>
                <v.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button onClick={handleCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Canvas</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-3">📄</span>
            <p className="text-sm font-medium text-white mb-1">{search ? 'No canvases match your search' : 'No canvases yet'}</p>
            <p className="text-xs text-[hsl(220,7%,45%)]">{search ? 'Try a different search term' : 'Use /canvas in any chat or create one here'}</p>
          </div>
        ) : (
          <>
            {pinnedItems.length > 0 && filter !== 'pinned' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="h-3.5 w-3.5 text-primary" fill="currentColor" />
                  <span className="text-xs font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider">Pinned ({pinnedItems.length}/7)</span>
                </div>
                <div className={gridClass}>
                  {view === 'details' ? (
                    <div className="rounded-xl border border-[hsl(225,9%,16%)] overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(220,8%,14%)] border-b border-[hsl(225,9%,14%)]">
                        <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider flex-1">Title</span>
                        <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider w-28 text-right">Last Edited</span>
                        <span className="w-20" />
                      </div>
                      {pinnedItems.map(c => <CanvasCard key={c.id} canvas={c} view={view} onOpen={setOpenCanvas} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} pinnedCount={pinnedCount} />)}
                    </div>
                  ) : pinnedItems.map(c => <CanvasCard key={c.id} canvas={c} view={view} onOpen={setOpenCanvas} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} pinnedCount={pinnedCount} />)}
                </div>
              </div>
            )}
            {unpinnedItems.length > 0 && (
              <div>
                {pinnedItems.length > 0 && filter !== 'pinned' && <p className="text-xs font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider mb-3">All Canvases</p>}
                {view === 'details' ? (
                  <div className="rounded-xl border border-[hsl(225,9%,16%)] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(220,8%,14%)] border-b border-[hsl(225,9%,14%)]">
                      <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider flex-1">Title</span>
                      <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider shrink-0">Space</span>
                      <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider w-28 text-right">Last Edited</span>
                      <span className="w-20" />
                    </div>
                    {unpinnedItems.map(c => <CanvasCard key={c.id} canvas={c} view={view} onOpen={setOpenCanvas} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} pinnedCount={pinnedCount} />)}
                  </div>
                ) : (
                  <div className={gridClass}>
                    {unpinnedItems.map(c => <CanvasCard key={c.id} canvas={c} view={view} onOpen={setOpenCanvas} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} pinnedCount={pinnedCount} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {openCanvas && <CanvasEditor canvas={openCanvas} onClose={() => setOpenCanvas(null)} onUpdate={handleUpdate} />}
    </div>
  );
}