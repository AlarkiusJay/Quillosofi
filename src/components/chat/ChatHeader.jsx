import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pin, PinOff, Pencil, FolderInput, FolderMinus, Trash2, Check, X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { app } from '@/api/localClient';

function SpacePicker({ spaces, currentSpaceId, onSelect, onClose, anchorRect }) {
  const style = anchorRect
    ? { position: 'fixed', top: anchorRect.bottom + 4, left: Math.min(anchorRect.left, window.innerWidth - 200) }
    : {};
  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <div className="absolute bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-52 max-h-64 overflow-y-auto" style={style} onClick={e => e.stopPropagation()}>
        <p className="text-[10px] text-[hsl(220,7%,45%)] px-2 py-1 font-semibold uppercase tracking-wider">Move to Space</p>
        {currentSpaceId && (
          <button onClick={() => onSelect(null)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[hsl(220,7%,75%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
            <span>💬</span> Direct Messages
          </button>
        )}
        {spaces.filter(s => s.id !== currentSpaceId).map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[hsl(220,7%,75%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
            <span>{s.emoji || '📁'}</span> {s.name}
          </button>
        ))}
        {spaces.filter(s => s.id !== currentSpaceId).length === 0 && !currentSpaceId && (
          <p className="text-[10px] text-[hsl(220,7%,45%)] px-2 py-2">No spaces yet.</p>
        )}
      </div>
    </div>
  );
}

export default function ChatHeader({ conversation, spaces, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [spaceAnchor, setSpaceAnchor] = useState(null);
  const menuRef = useRef(null);

  if (!conversation) return null;

  const pinnedCount = 0; // header doesn't know global count, just allow toggle
  const canPin = true;
  const currentSpace = spaces?.find(s => s.id === conversation.space_id);

  const openMenu = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(rect);
    setShowMenu(true);
  };

  const handlePin = async () => {
    await app.entities.Conversation.update(conversation.id, { is_pinned: !conversation.is_pinned });
    setShowMenu(false);
    onUpdate?.();
  };

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editTitle.trim()) return;
    await app.entities.Conversation.update(conversation.id, { title: editTitle.trim() });
    setEditing(false);
    onUpdate?.();
  };

  const handleMoveToSpace = async (spaceId) => {
    await app.entities.Conversation.update(conversation.id, { space_id: spaceId ?? null });
    setShowSpacePicker(false);
    setShowMenu(false);
    onUpdate?.();
  };

  const startEdit = () => {
    setEditTitle(conversation.title);
    setEditing(true);
    setShowMenu(false);
  };

  const handleAddToSpace = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpaceAnchor(rect);
    setShowSpacePicker(true);
  };

  const menuStyle = menuAnchor
    ? { position: 'fixed', top: menuAnchor.bottom + 4, left: Math.min(menuAnchor.right - 160, window.innerWidth - 180) }
    : {};

  return (
    <div className="flex items-center gap-2 px-4 h-11 border-b border-[hsl(225,9%,13%)] shrink-0" style={{ background: 'hsl(220, 8%, 18%)' }}>
      <Hash className="h-4 w-4 text-[hsl(220,7%,50%)] shrink-0" />

      {editing ? (
        <form onSubmit={handleEditSubmit} className="flex-1 flex items-center gap-2">
          <input
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="flex-1 bg-[hsl(228,8%,27%)] text-white text-sm px-2 py-0.5 rounded border border-primary/50 focus:outline-none min-w-0"
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
          />
          <button type="submit" className="p-1 text-green-400 hover:text-green-300"><Check className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setEditing(false)} className="p-1 text-[hsl(220,7%,50%)] hover:text-white"><X className="h-3.5 w-3.5" /></button>
        </form>
      ) : (
        <span className="flex-1 font-semibold text-sm text-white truncate">
          {conversation.title}
          {currentSpace && <span className="ml-2 text-[10px] font-normal text-[hsl(220,7%,50%)]">in {currentSpace.emoji || '📁'} {currentSpace.name}</span>}
        </span>
      )}

      {conversation.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}

      <button onClick={openMenu} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] transition-colors text-[hsl(220,7%,55%)] hover:text-white shrink-0">
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)}>
          <div className="absolute bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-44" style={menuStyle} onClick={e => e.stopPropagation()}>
            <button onClick={handlePin} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
              {conversation.is_pinned ? <PinOff className="h-3.5 w-3.5 text-primary shrink-0" /> : <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
              {conversation.is_pinned ? 'Unpin Chat' : 'Pin Chat'}
            </button>
            <button onClick={startEdit} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
              <Pencil className="h-3.5 w-3.5 text-primary shrink-0" /> Edit Chat Name
            </button>
            <button onClick={handleAddToSpace} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
              <FolderInput className="h-3.5 w-3.5 text-primary shrink-0" /> Add to Space
            </button>
            {conversation.space_id && (
              <button onClick={() => handleMoveToSpace(null)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
                <FolderMinus className="h-3.5 w-3.5 text-primary shrink-0" /> Remove from Space
              </button>
            )}
            <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
            <button onClick={() => { setShowMenu(false); onDelete?.(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
              <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete Chat
            </button>
          </div>
        </div>
      )}

      {showSpacePicker && (
        <SpacePicker
          spaces={spaces || []}
          currentSpaceId={conversation.space_id}
          onSelect={handleMoveToSpace}
          onClose={() => setShowSpacePicker(false)}
          anchorRect={spaceAnchor}
        />
      )}
    </div>
  );
}