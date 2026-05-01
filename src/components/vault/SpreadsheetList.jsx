import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { app } from '@/api/localClient';
import { Search, LayoutGrid, List, Trash2, SortAsc, ChevronDown, Table2, Star, Pin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SORT_OPTIONS = [
  { id: 'updated_desc', label: 'Last Edited' },
  { id: 'created_desc', label: 'Date Created' },
  { id: 'name_asc', label: 'Name (A–Z)' },
  { id: 'name_desc', label: 'Name (Z–A)' },
];

function SpreadsheetCard({ sheet, view, onOpen, onDelete, onTogglePin, onToggleFavorite }) {
  const date = sheet.updated_date ? format(new Date(sheet.updated_date), 'MMM d, yyyy') : '';
  const rows = sheet.num_rows || 0;
  const cols = sheet.num_cols || 0;

  if (view === 'details' || view === 'list') {
    return (
      <div onClick={() => onOpen?.(sheet)} className="group flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(225,9%,14%)] hover:bg-[hsl(228,7%,22%)] cursor-pointer transition-colors">
        <span className="text-base shrink-0">📊</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{sheet.title}</p>
          {view === 'details' && <p className="text-[10px] text-[hsl(220,7%,40%)] mt-0.5">{rows} rows × {cols} cols</p>}
        </div>
        <span className="text-xs text-[hsl(220,7%,45%)] shrink-0 hidden sm:block">{rows}×{cols}</span>
        <span className="text-xs text-[hsl(220,7%,45%)] shrink-0 w-28 text-right">{date}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onOpen?.(sheet); }} title="Open in Sheets Editor" className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-primary transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(sheet); }} className={cn("h-6 w-6 rounded flex items-center justify-center transition-colors", sheet.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,45%)] hover:text-yellow-400")}>
            <Star className="h-3.5 w-3.5" fill={sheet.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(sheet); }} className={cn("h-6 w-6 rounded flex items-center justify-center transition-colors", sheet.is_pinned ? "text-primary" : "text-[hsl(220,7%,45%)] hover:text-primary")}>
            <Pin className="h-3.5 w-3.5" fill={sheet.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(sheet); }} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid view — click anywhere to open in the Sheets editor hub.
  return (
    <div onClick={() => onOpen?.(sheet)} className="group relative rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,16%)] hover:border-primary/40 hover:bg-[hsl(228,7%,20%)] cursor-pointer transition-all overflow-hidden">
      <div className="p-4 min-h-[80px] flex flex-col gap-1">
        {[...Array(4)].map((_, ri) => (
          <div key={ri} className="flex gap-1">
            {[...Array(5)].map((_, ci) => (
              <div key={ci} className={cn("h-3 rounded-sm flex-1", ri === 0 ? "bg-primary/20" : "bg-[hsl(225,9%,22%)]")} />
            ))}
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)] flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{sheet.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[hsl(220,7%,40%)]">{rows} rows × {cols} cols</span>
            <span className="text-[10px] text-[hsl(220,7%,35%)]">·</span>
            <span className="text-[10px] text-[hsl(220,7%,40%)]">{date}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          {sheet.is_favorite && <Star className="h-3 w-3 text-yellow-400 shrink-0" fill="currentColor" />}
          {sheet.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" fill="currentColor" />}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onOpen?.(sheet); }} title="Open in Sheets Editor" className="h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] text-[hsl(220,7%,55%)] hover:text-primary transition-colors">
          <ExternalLink className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(sheet); }} className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors", sheet.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,55%)] hover:text-yellow-400")}>
          <Star className="h-3 w-3" fill={sheet.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onTogglePin(sheet); }} className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors", sheet.is_pinned ? "text-primary" : "text-[hsl(220,7%,55%)] hover:text-primary")}>
          <Pin className="h-3 w-3" fill={sheet.is_pinned ? 'currentColor' : 'none'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(sheet); }} className="h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] text-[hsl(220,7%,55%)] hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// filter: 'all' | 'pinned' | 'favorites'
// compact: hides topbar (used in combined Pinned/Favorites view)
export default function SpreadsheetList({ filter = 'all', compact = false }) {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [showSort, setShowSort] = useState(false);
  const [search, setSearch] = useState('');

  const VIEWS = [
    { id: 'grid', icon: LayoutGrid, label: 'Grid' },
    { id: 'list', icon: List, label: 'List' },
    { id: 'details', icon: Table2, label: 'Details' },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await app.entities.Spreadsheet.list('-updated_date', 200);
      setSheets(data);
      setLoading(false);
    };
    load();
  }, []);

  // Quillibrary is pure storage — "open" routes to the Sheets editor hub.
  const handleOpen = (sheet) => navigate(`/sheets/${sheet.id}`);

  const handleDelete = async (sheet) => {
    if (!confirm(`Delete "${sheet.title}"?`)) return;
    setSheets(prev => prev.filter(s => s.id !== sheet.id));
    await app.entities.Spreadsheet.delete(sheet.id);
  };

  const handleTogglePin = async (sheet) => {
    const next = !sheet.is_pinned;
    setSheets(prev => prev.map(s => s.id === sheet.id ? { ...s, is_pinned: next } : s));
    await app.entities.Spreadsheet.update(sheet.id, { is_pinned: next });
  };

  const handleToggleFavorite = async (sheet) => {
    const next = !sheet.is_favorite;
    setSheets(prev => prev.map(s => s.id === sheet.id ? { ...s, is_favorite: next } : s));
    await app.entities.Spreadsheet.update(sheet.id, { is_favorite: next });
  };

  const filtered = useMemo(() => {
    let result = [...sheets];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q));
    }
    if (filter === 'pinned') result = result.filter(s => s.is_pinned);
    else if (filter === 'favorites') result = result.filter(s => s.is_favorite);

    result.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
      if (sortBy === 'created_desc') return new Date(b.created_date) - new Date(a.created_date);
      return new Date(b.updated_date) - new Date(a.updated_date);
    });
    return result;
  }, [sheets, search, sortBy, filter]);

  const gridClass = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

  return (
    <div className={cn("flex flex-col", compact ? "" : "flex-1 overflow-hidden")}>
      {/* Top bar — hidden in compact mode */}
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(225,9%,14%)] shrink-0 bg-[hsl(220,8%,17%)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(220,7%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search spreadsheets..."
              className="w-full bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] text-xs text-[hsl(220,7%,60%)] hover:text-white transition-colors">
                <SortAsc className="h-3.5 w-3.5" />
                {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
                <ChevronDown className="h-3 w-3" />
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
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn("px-4 py-4", compact ? "" : "flex-1 overflow-y-auto")}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">📊</span>
            <p className="text-xs text-[hsl(220,7%,45%)]">
              {filter === 'pinned' ? 'No pinned spreadsheets' : filter === 'favorites' ? 'No favorite spreadsheets' : 'No spreadsheets yet — use /spreadsheet in chat'}
            </p>
          </div>
        ) : view === 'grid' || compact ? (
          <div className={gridClass}>
            {filtered.map(s => <SpreadsheetCard key={s.id} sheet={s} view="grid" onOpen={handleOpen} onDelete={handleDelete} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-[hsl(225,9%,16%)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(220,8%,14%)] border-b border-[hsl(225,9%,14%)]">
              <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider flex-1">Title</span>
              <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider hidden sm:block">Size</span>
              <span className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-wider w-28 text-right">Last Edited</span>
              <span className="w-20" />
            </div>
            {filtered.map(s => <SpreadsheetCard key={s.id} sheet={s} view={view} onOpen={handleOpen} onDelete={handleDelete} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} />)}
          </div>
        )}
      </div>
    </div>
  );
}