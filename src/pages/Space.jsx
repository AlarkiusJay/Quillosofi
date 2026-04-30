import { useState, useEffect } from 'react';
import ConfirmDialog from '../components/chat/ConfirmDialog';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { guestStorage } from '../utils/guestStorage';
import { ArrowLeft, Plus, MessageSquare, Trash2, Edit2, Link as LinkIcon, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import SpaceModal from '../components/spaces/SpaceModal';

export default function Space() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { loadConversations } = useOutletContext();
  const [space, setSpace] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const load = async () => {
      const isAuthed = await base44.auth.isAuthenticated();
      if (!isAuthed) {
        const guestSpaces = guestStorage.getSpaces();
        const guestConvos = guestStorage.getConversations().filter(c => c.space_id === spaceId && !c.is_archived);
        setSpace(guestSpaces.find(s => s.id === spaceId) || null);
        setConversations(guestConvos);
      } else {
        const [spaces, convos] = await Promise.all([
          base44.entities.ProjectSpace.filter({ id: spaceId }),
          base44.entities.Conversation.filter({ space_id: spaceId, is_archived: false }, '-created_date', 100),
        ]);
        setSpace(spaces[0]);
        setConversations(convos);
      }
      setLoading(false);
    };
    load();
  }, [spaceId]);

  const handleNewChat = async () => {
    const isAuthed = await base44.auth.isAuthenticated();
    let convo;
    if (!isAuthed) {
      convo = guestStorage.createConversation({ title: 'New chat', space_id: spaceId, is_archived: false });
      setConversations(prev => [convo, ...prev]);
    } else {
      convo = await base44.entities.Conversation.create({ title: 'New chat', space_id: spaceId, is_archived: false });
    }
    await loadConversations();
    navigate(`/chat/${convo.id}`);
  };

  const handleDelete = (id) => setPendingDelete(id);

  const doDelete = async (id) => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.updateConversation(id, { is_archived: true });
    } else {
      await base44.entities.Conversation.update(id, { is_archived: true });
    }
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  const handleSpaceUpdated = (updated) => {
    if (updated.deleted) {
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
          <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-3xl">{space.emoji || '📁'}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{space.name}</h1>
            {space.description && <p className="text-sm text-muted-foreground truncate">{space.description}</p>}
          </div>
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {space.system_prompt && (
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">⚡ Custom instructions active</span>
          )}
          {space.memory_enabled && space.space_memory && (
            <span className="text-xs px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">🧠 Space memory active</span>
          )}
          {space.links?.length > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground border border-border font-medium">🔗 {space.links.length} source{space.links.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Links */}
        {space.links?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sources & Links</p>
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

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New chat in this space
        </button>

        {/* Conversations */}
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No chats yet — start one above!</div>
        ) : (
          <div className="space-y-1">
            {conversations.map(c => (
              <div key={c.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link to={`/chat/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title || 'New chat'}</p>
                  {c.last_message_preview && (
                    <p className="text-xs text-muted-foreground truncate">{c.last_message_preview}</p>
                  )}
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-all"
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
          message="This will delete the chat permanently."
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