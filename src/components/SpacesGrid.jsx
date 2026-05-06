import { useNavigate } from 'react-router-dom';
import { guestStorage } from '../utils/guestStorage';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { app } from '@/api/localClient';
import SpaceModal from './spaces/SpaceModal';

export default function SpacesGrid() {
  const [spaces, setSpaces] = useState([]);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingDeleteSpace, setPendingDeleteSpace] = useState(null);
  const navigate = useNavigate();

  const loadSpaces = async () => {
    setLoading(true);
    const isAuthed = await app.auth.isAuthenticated();
    if (!isAuthed) {
      setSpaces(guestStorage.getSpaces());
      setLoading(false);
      return;
    }
    const data = await app.entities.ProjectSpace.list('-created_date', 50);
    setSpaces(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSpaces();
  }, []);

  const handleSpaceCreated = (s) => {
    setShowSpaceModal(false);
    setEditingSpace(null);
    loadSpaces();
  };

  const handleContextMenu = (e, space) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ space, x: e.clientX, y: e.clientY });
  };

  const handleDeleteSpace = (space) => {
    setContextMenu(null);
    setPendingDeleteSpace(space);
  };

  const doDeleteSpace = async () => {
    const space = pendingDeleteSpace;
    setPendingDeleteSpace(null);
    const isAuthed = await app.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.deleteSpace(space.id);
    } else {
      await app.entities.ProjectSpace.delete(space.id);
    }
    loadSpaces();
  };

  const isImg = (emoji) => emoji && (emoji.startsWith('http') || emoji.startsWith('/'));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" onContextMenu={e => e.preventDefault()}>
      {pendingDeleteSpace && (
        <ConfirmDialog
          message={`Delete "${pendingDeleteSpace.name}"? Conversations in it will move to Direct Messages.`}
          onConfirm={doDeleteSpace}
          onCancel={() => setPendingDeleteSpace(null)}
          confirmLabel="Delete"
        />
      )}
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Spaces</h1>
        <p className="text-sm text-muted-foreground mb-6">Select a space to get started</p>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
            {spaces.map(s => (
              <div
                key={s.id}
                className="group block p-6 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-pointer"
                onClick={() => navigate(`/space/${s.id}`)}
                onContextMenu={(e) => handleContextMenu(e, s)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {isImg(s.emoji)
                      ? <img src={s.emoji} alt={s.name} className="w-10 h-10 rounded object-cover" />
                      : (s.emoji || '📁')
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-white truncate group-hover:text-primary transition-colors">{s.name}</h2>
                    {s.description && <p className="text-xs text-muted-foreground truncate mt-1">{s.description}</p>}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowSpaceModal(true)}
              className="group block p-6 rounded-xl border border-dashed border-muted-foreground/50 hover:border-primary/50 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
            >
              <Plus className="h-8 w-8 mb-2" />
              <span className="font-semibold text-sm">New Space</span>
            </button>
          </div>
        )}
      </div>

      {showSpaceModal && (
        <SpaceModal
          initialSpace={editingSpace}
          onClose={() => { setShowSpaceModal(false); setEditingSpace(null); }}
          onSave={handleSpaceCreated}
        />
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[70] bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-40"
            style={{ top: contextMenu.y + 4, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setEditingSpace(contextMenu.space); setShowSpaceModal(true); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Edit Space
            </button>
            <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
            <button
              onClick={() => handleDeleteSpace(contextMenu.space)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Space
            </button>
          </div>
        </>
      )}
    </div>
  );
}