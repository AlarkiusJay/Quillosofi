import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { app } from '@/api/localClient';
import { Menu, X, Plus, Pin, Star, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CanvasList from '../components/vault/CanvasList';
import SpreadsheetList from '../components/vault/SpreadsheetList';
import CustomDictionary from '../components/vault/CustomDictionary';
import SpaceModal from '../components/spaces/SpaceModal';
import ConfirmDialog from '../components/ConfirmDialog';

// filter can be: 'pinned' | 'favorites' | 'all_canvases' | 'all_spreadsheets' | 'dictionary' | 'space:<id>'
//
// v0.4.48 — Spaces are now a Quillibrary feature, not a top-level rail tab.
//   • The +/star/pin live on the SPACES section header & each space row.
//   • Spaces can be pinned and favorited just like canvases.
//   • Pinned spaces float to the top of the Spaces section in the sidebar.
//   • Pinned/Favorites top filters now show spaces alongside canvases & sheets.
export default function CanvasVault() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('all_canvases');
  const [spaces, setSpaces] = useState([]);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadSpaces = useCallback(async () => {
    const data = await app.entities.ProjectSpace.list('-created_date', 100);
    setSpaces(data || []);
  }, []);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const handleFilterClick = (id) => {
    setFilter(id);
    setSidebarOpen(false);
  };

  const handleSpaceContextMenu = (e, space) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ space, x: e.clientX, y: e.clientY });
  };

  const handleSpaceSaved = (s) => {
    setShowSpaceModal(false);
    setEditingSpace(null);
    loadSpaces();
  };

  const handleEditSpace = (space) => {
    setEditingSpace(space);
    setShowSpaceModal(true);
    setContextMenu(null);
  };

  const handleToggleSpacePin = async (space) => {
    const next = !space.is_pinned;
    setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, is_pinned: next } : s));
    try { await app.entities.ProjectSpace.update(space.id, { is_pinned: next }); } catch {}
    setContextMenu(null);
  };

  const handleToggleSpaceFavorite = async (space) => {
    const next = !space.is_favorite;
    setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, is_favorite: next } : s));
    try { await app.entities.ProjectSpace.update(space.id, { is_favorite: next }); } catch {}
    setContextMenu(null);
  };

  const handleDeleteSpace = (space) => {
    setContextMenu(null);
    setPendingDelete(space);
  };

  const doDeleteSpace = async () => {
    const space = pendingDelete;
    setPendingDelete(null);
    try { await app.entities.ProjectSpace.delete(space.id); } catch {}
    if (filter === `space:${space.id}`) setFilter('all_canvases');
    loadSpaces();
  };

  const topFilters = [
    { id: 'pinned',           label: 'Pinned',            icon: '📌' },
    { id: 'favorites',        label: 'Favorites',         icon: '⭐' },
    { id: 'all_canvases',     label: 'All Canvases',      icon: '📄' },
    { id: 'all_spreadsheets', label: 'All Spreadsheets',  icon: '📊' },
    { id: 'dictionary',       label: 'Custom Dictionary', icon: '📖' },
  ];

  const isCombined = filter === 'pinned' || filter === 'favorites';
  const isSpreadsheets = filter === 'all_spreadsheets';
  const isDictionary = filter === 'dictionary';

  // Sort spaces in the sidebar: pinned first, then by created_date desc.
  const sortedSpaces = [...spaces].sort((a, b) => {
    if (!!b.is_pinned !== !!a.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
    return new Date(b.created_date || 0) - new Date(a.created_date || 0);
  });

  // For Pinned/Favorites combined views, show matching spaces in their own section.
  const matchingSpaces = filter === 'pinned'
    ? spaces.filter(s => s.is_pinned)
    : filter === 'favorites'
      ? spaces.filter(s => s.is_favorite)
      : [];

  const sectionLabel = topFilters.find(f => f.id === filter)?.label || 'Library';
  const isImg = (emoji) => emoji && (emoji.startsWith('http') || emoji.startsWith('/'));

  // Space card — mirrors the canvas/sheet grid card so Pinned/Favorites view
  // reads as a uniform grid of cards, not a mix of cards + thin rows.
  const SpaceCard = ({ space }) => (
    <div
      onClick={() => navigate(`/space/${space.id}`)}
      onContextMenu={(e) => handleSpaceContextMenu(e, space)}
      className="group relative rounded-xl border border-[hsl(225,9%,18%)] bg-[hsl(220,8%,16%)] hover:border-primary/40 hover:bg-[hsl(228,7%,20%)] cursor-pointer transition-all overflow-hidden"
    >
      <div className="p-4 min-h-[80px] flex items-center justify-center">
        <div className="text-5xl">
          {isImg(space.emoji)
            ? <img src={space.emoji} alt={space.name} className="w-14 h-14 rounded object-cover" />
            : (space.emoji || '📁')
          }
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)] flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{space.name}</p>
          {space.description && (
            <p className="text-[10px] text-[hsl(220,7%,45%)] truncate mt-0.5">{space.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          {space.is_favorite && <Star className="h-3 w-3 text-yellow-400 shrink-0" fill="currentColor" />}
          {space.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" fill="currentColor" />}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleSpaceFavorite(space); }}
          title={space.is_favorite ? 'Unfavorite' : 'Favorite'}
          className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors",
            space.is_favorite ? "text-yellow-400" : "text-[hsl(220,7%,55%)] hover:text-yellow-400"
          )}
        >
          <Star className="h-3 w-3" fill={space.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleSpacePin(space); }}
          title={space.is_pinned ? 'Unpin' : 'Pin'}
          className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-[hsl(220,8%,20%)]/80 backdrop-blur-sm border border-[hsl(225,9%,20%)] transition-colors",
            space.is_pinned ? "text-primary" : "text-[hsl(220,7%,55%)] hover:text-primary"
          )}
        >
          <Pin className="h-3 w-3" fill={space.is_pinned ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left sidebar */}
      <div className={[
        'fixed md:static top-0 left-0 h-full z-50 md:z-auto',
        'w-56 md:w-48 shrink-0',
        'border-r border-[hsl(225,9%,14%)] bg-[hsl(220,8%,16%)]',
        'flex flex-col py-4 px-2 gap-0.5 overflow-y-auto',
        'transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ].join(' ')}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-2">Library</p>
          <button className="md:hidden p-1 text-[hsl(220,7%,50%)] hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {topFilters.map(item => (
          <button key={item.id} onClick={() => handleFilterClick(item.id)}
            className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              filter === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-[hsl(220,7%,60%)] hover:bg-[hsl(228,7%,22%)] hover:text-white'
            )}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}

        {/* SPACES section — header has a + to add a new space */}
        <div className="h-px bg-[hsl(225,9%,14%)] my-2 mx-1" />
        <div className="flex items-center justify-between px-2 mb-1">
          <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest">Spaces</p>
          <button
            onClick={() => { setEditingSpace(null); setShowSpaceModal(true); }}
            title="New space"
            className="h-5 w-5 rounded flex items-center justify-center text-[hsl(220,7%,50%)] hover:bg-[hsl(228,7%,22%)] hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {sortedSpaces.length === 0 ? (
          <p className="text-[10px] text-[hsl(220,7%,35%)] px-2 py-1.5 italic">
            No spaces yet. Tap + to add one.
          </p>
        ) : (
          sortedSpaces.map(s => (
            <button
              key={s.id}
              onClick={() => handleFilterClick(`space:${s.id}`)}
              onContextMenu={(e) => handleSpaceContextMenu(e, s)}
              className={cn(
                'group/space flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                filter === `space:${s.id}`
                  ? 'bg-primary/15 text-primary'
                  : 'text-[hsl(220,7%,60%)] hover:bg-[hsl(228,7%,22%)] hover:text-white'
              )}
            >
              <span className="shrink-0">
                {isImg(s.emoji)
                  ? <img src={s.emoji} alt={s.name} className="w-3.5 h-3.5 rounded object-cover" />
                  : (s.emoji || '📁')
                }
              </span>
              <span className="truncate flex-1">{s.name}</span>
              {s.is_pinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0" fill="currentColor" />}
              {s.is_favorite && <Star className="h-2.5 w-2.5 text-yellow-400 shrink-0" fill="currentColor" />}
            </button>
          ))
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(225,9%,14%)] shrink-0 bg-[hsl(220,8%,17%)] md:hidden">
          <button
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] text-[hsl(220,7%,60%)] hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-white">{sectionLabel}</span>
        </div>

        {isCombined ? (
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-[hsl(225,9%,14%)]">
              <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-5 pt-4 pb-1">📄 Canvases</p>
              <CanvasList filter={filter} spaces={spaces} compact />
            </div>
            {matchingSpaces.length > 0 && (
              <div className="border-b border-[hsl(225,9%,14%)]">
                <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-5 pt-4 pb-2">📁 Spaces</p>
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {matchingSpaces.map(s => <SpaceCard key={s.id} space={s} />)}
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-5 pt-4 pb-1">📊 Spreadsheets</p>
              <SpreadsheetList filter={filter} compact />
            </div>
          </div>
        ) : isDictionary ? (
          <CustomDictionary />
        ) : isSpreadsheets ? (
          <SpreadsheetList filter="all" />
        ) : (
          <CanvasList filter={filter === 'all_canvases' ? 'all' : filter} spaces={spaces} />
        )}
      </div>

      {showSpaceModal && (
        <SpaceModal
          initialSpace={editingSpace}
          onClose={() => { setShowSpaceModal(false); setEditingSpace(null); }}
          onSave={handleSpaceSaved}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete "${pendingDelete.name}"? Canvases inside it won't be deleted, but they'll lose their space.`}
          onConfirm={doDeleteSpace}
          onCancel={() => setPendingDelete(null)}
          confirmLabel="Delete"
        />
      )}

      {/* Space context menu (right-click) */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[70] bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-44"
            style={{ top: contextMenu.y + 4, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => handleToggleSpacePin(contextMenu.space)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left"
            >
              <Pin className="h-3.5 w-3.5 text-primary" fill={contextMenu.space.is_pinned ? 'currentColor' : 'none'} />
              {contextMenu.space.is_pinned ? 'Unpin space' : 'Pin space'}
            </button>
            <button
              onClick={() => handleToggleSpaceFavorite(contextMenu.space)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left"
            >
              <Star className="h-3.5 w-3.5 text-yellow-400" fill={contextMenu.space.is_favorite ? 'currentColor' : 'none'} />
              {contextMenu.space.is_favorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
            <button
              onClick={() => handleEditSpace(contextMenu.space)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Edit space
            </button>
            <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
            <button
              onClick={() => handleDeleteSpace(contextMenu.space)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete space
            </button>
          </div>
        </>
      )}
    </div>
  );
}
