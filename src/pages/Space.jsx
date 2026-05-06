import { useState, useEffect } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { app } from '@/api/localClient';
import { guestStorage } from '../utils/guestStorage';
import { ArrowLeft, Plus, FileText, Trash2, Edit2, Link as LinkIcon, NotebookPen, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import SpaceModal from '../components/spaces/SpaceModal';

export default function Space() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [canvases, setCanvases] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const safeList = async (entityName, ...args) => {
    try {
      const ent = app.entities?.[entityName];
      if (!ent) return [];
      return (await ent.list(...args)) || [];
    } catch { return []; }
  };

  const safeFilter = async (entityName, query, ...args) => {
    try {
      const ent = app.entities?.[entityName];
      if (!ent) return [];
      return (await ent.filter(query, ...args)) || [];
    } catch { return []; }
  };

  const load = async () => {
    setLoading(true);
    let isAuthed = false;
    try { isAuthed = await app.auth.isAuthenticated(); } catch {}

    if (!isAuthed) {
      const guestSpaces = guestStorage.getSpaces?.() || [];
      setSpace(guestSpaces.find(s => s.id === spaceId) || null);
      const allCanvases = (await safeList('Canvas', '-updated_date', 500))
        .filter(c => c.space_id === spaceId);
      setCanvases(allCanvases);
      const allFiles = (await safeList('SpaceFile', '-updated_date', 500))
        .filter(f => f.space_id === spaceId);
      setFiles(allFiles);
    } else {
      const [spaces, spaceCanvases, spaceFiles] = await Promise.all([
        safeFilter('ProjectSpace', { id: spaceId }),
        safeFilter('Canvas', { space_id: spaceId }, '-updated_date', 200),
        safeFilter('SpaceFile', { space_id: spaceId }, '-updated_date', 200),
      ]);
      setSpace(spaces[0] || null);
      setCanvases(spaceCanvases);
      setFiles(spaceFiles);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [spaceId]);

  const handleNewCanvas = async () => {
    let isAuthed = false;
    try { isAuthed = await app.auth.isAuthenticated(); } catch {}
    let canvas;
    if (!isAuthed) {
      // Local/desktop path — Canvas entity in localClient
      canvas = await app.entities.Canvas.create({ title: 'Untitled Canvas', content: '', space_id: spaceId });
    } else {
      canvas = await app.entities.Canvas.create({ title: 'Untitled Canvas', content: '', space_id: spaceId });
    }
    navigate(`/canvas/${canvas.id}`);
  };

  const handleDelete = (id) => setPendingDelete(id);

  const doDelete = async (id) => {
    try {
      await app.entities.Canvas.delete(id);
    } catch {}
    setCanvases(prev => prev.filter(c => c.id !== id));
  };

  const handleSpaceUpdated = (updated) => {
    if (updated?.deleted) {
      navigate('/spaces');
    } else {
      setSpace(updated);
      setShowEdit(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!space) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">Space not found.</div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/spaces" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-3xl">{space.emoji || '📁'}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{space.name}</h1>
            {space.description && <p className="text-sm text-muted-foreground truncate">{space.description}</p>}
          </div>
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Edit space">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        {/* Notes (formerly system_prompt — repurposed as plain notes) */}
        {space.system_prompt && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <NotebookPen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{space.system_prompt}</p>
          </div>
        )}

        {/* Reference Links */}
        {space.links?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Reference Links</p>
            <div className="space-y-2">
              {space.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors group">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="truncate">{link.title || link.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Attached files */}
        {files.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Attached Files</p>
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{f.name || f.filename || 'Untitled file'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Canvas button */}
        <button
          onClick={handleNewCanvas}
          className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New canvas in this space
        </button>

        {/* Canvases */}
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canvases</p>
          <span className="text-[10px] text-muted-foreground/60">· {canvases.length}</span>
        </div>
        {canvases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No canvases here yet — start one above.</div>
        ) : (
          <div className="space-y-1">
            {canvases.map(c => (
              <div key={c.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link to={`/canvas/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title || 'Untitled Canvas'}</p>
                  {c.updated_date && (
                    <p className="text-xs text-muted-foreground truncate">
                      Updated {format(new Date(c.updated_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-all"
                  title="Delete canvas"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          message="Delete this canvas permanently?"
          onConfirm={() => { doDelete(pendingDelete); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showEdit && (
        <SpaceModal
          initialSpace={space}
          onClose={() => setShowEdit(false)}
          onSave={handleSpaceUpdated}
        />
      )}
    </div>
  );
}
