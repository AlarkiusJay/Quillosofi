import { useState, useRef, useEffect } from 'react';
import InAppLogin from '../InAppLogin';
import GuestBanner from '../guest/GuestBanner';
import { useGuestMode } from '../../hooks/useGuestMode';
import { guestStorage } from '../../utils/guestStorage';
import SettingsModal from '../SettingsModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Hash, X, Pin, PinOff, Pencil, Check, FolderInput, FolderMinus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '../Tooltip';
import { base44 } from '@/api/base44Client';

const LONG_PRESS_MS = 500;

function SpacePickerDropdown({ spaces, currentSpaceId, onSelect, onClose, anchorRect }) {
  const style = anchorRect ?
  { position: 'fixed', top: anchorRect.bottom + 4, left: Math.min(anchorRect.left, window.innerWidth - 200) } :
  {};

  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <div
        className="absolute bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-52 max-h-64 overflow-y-auto"
        style={style}
        onClick={(e) => e.stopPropagation()}>
        
        <p className="text-[10px] text-[hsl(220,7%,45%)] px-2 py-1 font-semibold uppercase tracking-wider">Move to Space</p>
        {currentSpaceId &&
        <button onClick={() => onSelect(null)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[hsl(220,7%,75%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
            <span>💬</span> Direct Messages
          </button>
        }
        {spaces.filter((s) => s.id !== currentSpaceId).map((s) =>
        <button key={s.id} onClick={() => onSelect(s.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[hsl(220,7%,75%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
            <span>{s.emoji || '📁'}</span> {s.name}
          </button>
        )}
        {spaces.filter((s) => s.id !== currentSpaceId).length === 0 && !currentSpaceId &&
        <p className="text-[10px] text-[hsl(220,7%,45%)] px-2 py-2">No spaces yet.</p>
        }
      </div>
    </div>);

}

function ConvoMenu({ c, pinnedCount, spaces, onPin, onStartEdit, onMoveToSpace, onDelete, onClose }) {
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [spaceAnchor, setSpaceAnchor] = useState(null);

  const handleAddToSpace = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpaceAnchor(rect);
    setShowSpacePicker(true);
  };

  const canPin = c.is_pinned || pinnedCount < 5;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end md:items-start" onClick={onClose}>
        <div
          className="md:hidden w-full bg-[hsl(220,8%,18%)] border-t border-[hsl(225,9%,12%)] rounded-t-2xl p-4 pb-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          
          <p className="text-xs text-[hsl(220,7%,50%)] mb-3 text-center font-semibold truncate">{c.title}</p>
          <div className="space-y-0.5">
            <button onClick={() => {onPin();onClose();}} disabled={!canPin} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-left", canPin ? "text-white hover:bg-[hsl(228,7%,27%)]" : "text-[hsl(220,7%,40%)] cursor-not-allowed")}>
              {c.is_pinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4 text-primary" />}
              {c.is_pinned ? 'Unpin Chat' : canPin ? 'Pin Chat' : 'Pin limit reached (5)'}
            </button>
            <button onClick={() => {onStartEdit();onClose();}} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
              <Pencil className="h-4 w-4 text-primary" /> Edit Chat Name
            </button>
            <button onClick={handleAddToSpace} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
              <FolderInput className="h-4 w-4 text-primary" /> Add to Space
            </button>
            {c.space_id &&
            <button onClick={() => {onMoveToSpace(null);onClose();}} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
                <FolderMinus className="h-4 w-4 text-primary" /> Remove from Space
              </button>
            }
            <button onClick={() => {onDelete();onClose();}} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
              <Trash2 className="h-4 w-4" /> Delete Chat
            </button>
          </div>
        </div>
      </div>

      {showSpacePicker &&
      <SpacePickerDropdown
        spaces={spaces}
        currentSpaceId={c.space_id}
        onSelect={(sid) => {onMoveToSpace(sid);setShowSpacePicker(false);onClose();}}
        onClose={() => setShowSpacePicker(false)}
        anchorRect={spaceAnchor} />

      }
    </>);

}

function DesktopConvoMenu({ c, pinnedCount, spaces, onPin, onStartEdit, onMoveToSpace, onDelete, onClose, menuPos }) {
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [spaceAnchor, setSpaceAnchor] = useState(null);
  const canPin = c.is_pinned || pinnedCount < 5;

  const handleAddToSpace = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpaceAnchor(rect);
    setShowSpacePicker(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div className="fixed bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-lg p-1.5 min-w-40" style={{ top: menuPos?.y || 0, left: menuPos?.x || 0, zIndex: 70 }}>
        <button onClick={() => {onPin();onClose();}} disabled={!canPin} className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors text-left", canPin ? "text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white" : "text-[hsl(220,7%,40%)] cursor-not-allowed")}>
          {c.is_pinned ? <PinOff className="h-3.5 w-3.5 text-primary shrink-0" /> : <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
          {c.is_pinned ? 'Unpin Chat' : canPin ? 'Pin Chat' : 'Pin limit (5)'}
        </button>
        <button onClick={() => {onStartEdit();onClose();}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
          <Pencil className="h-3.5 w-3.5 text-primary shrink-0" /> Edit Chat Name
        </button>
        <button onClick={handleAddToSpace} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
          <FolderInput className="h-3.5 w-3.5 text-primary shrink-0" /> Add to Space
        </button>
        {c.space_id &&
        <button onClick={() => {onMoveToSpace(null);onClose();}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
            <FolderMinus className="h-3.5 w-3.5 text-primary shrink-0" /> Remove from Space
          </button>
        }
        <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
        <button onClick={() => {onDelete();onClose();}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
          <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete Chat
        </button>
      </div>

      {showSpacePicker &&
      <SpacePickerDropdown
        spaces={spaces}
        currentSpaceId={c.space_id}
        onSelect={(sid) => {onMoveToSpace(sid);setShowSpacePicker(false);onClose();}}
        onClose={() => setShowSpacePicker(false)}
        anchorRect={spaceAnchor} />

      }
    </>);

}

function ConvoItem({ c, pinnedCount, spaces, onClose, onDelete, onUpdate, activeId }) {
  const menuRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(c.title);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [spaceAnchor, setSpaceAnchor] = useState(null);
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const pressTimer = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => {
    if (!showSideMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && itemRef.current && !itemRef.current.contains(e.target)) {
        setShowSideMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSideMenu]);

  useEffect(() => {
    if (!showSideMenu) return;
    let mouseTimer = null;
    const handleMouseLeave = () => {
      mouseTimer = setTimeout(() => {
        setShowSideMenu(false);
      }, 30000);
    };
    const handleMouseEnter = () => {
      if (mouseTimer) clearTimeout(mouseTimer);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (mouseTimer) clearTimeout(mouseTimer);
    };
  }, [showSideMenu]);

  const openMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX + 4, y: e.clientY + 4 });
    setShowDesktopMenu(true);
  };

  const handleAddToSpace = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpaceAnchor(rect);
    setShowSpacePicker(true);
  };

  const handlePin = async () => {
    if (!c.is_pinned && pinnedCount >= 5) return;
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.updateConversation(c.id, { is_pinned: !c.is_pinned });
    } else {
      await base44.entities.Conversation.update(c.id, { is_pinned: !c.is_pinned });
    }
    onUpdate?.();
  };

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editTitle.trim()) return;
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.updateConversation(c.id, { title: editTitle.trim() });
    } else {
      await base44.entities.Conversation.update(c.id, { title: editTitle.trim() });
    }
    setEditing(false);
    onUpdate?.();
  };

  const handleMoveToSpace = async (spaceId) => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.updateConversation(c.id, { space_id: spaceId ?? null });
    } else {
      await base44.entities.Conversation.update(c.id, { space_id: spaceId ?? null });
    }
    onUpdate?.();
  };

  const onTouchStart = (e) => {
    pressTimer.current = setTimeout(() => {
      setMenuPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setShowMobileMenu(true);
    }, LONG_PRESS_MS);
  };
  const onTouchEnd = () => clearTimeout(pressTimer.current);

  return (
    <>
      {showSideMenu &&
      <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowSideMenu(false)} />
          <div ref={menuRef} className="fixed bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-lg p-1.5 min-w-40 z-[70]" style={{ top: itemRef.current?.getBoundingClientRect().top || 0, left: (itemRef.current?.getBoundingClientRect().right || 0) + 8 }}>
            <button onClick={() => {setEditTitle(c.title);setEditing(true);setShowSideMenu(false);}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
              <Pencil className="h-3.5 w-3.5 text-primary shrink-0" /> Edit Name
            </button>
            <button onClick={handleAddToSpace} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left">
              <FolderInput className="h-3.5 w-3.5 text-primary shrink-0" /> Add to Space
            </button>
            <div className="my-1 border-t border-[hsl(225,9%,15%)]" />
            <button onClick={() => {onDelete(c.id);setShowSideMenu(false);}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-red-400 hover:bg-[hsl(228,7%,27%)] transition-colors text-left">
              <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete Chat
            </button>
          </div>
        </>
      }

      {showSpacePicker &&
      <SpacePickerDropdown
        spaces={spaces}
        currentSpaceId={c.space_id}
        onSelect={(sid) => {handleMoveToSpace(sid);setShowSpacePicker(false);setShowSideMenu(false);}}
        onClose={() => setShowSpacePicker(false)}
        anchorRect={spaceAnchor} />

      }

      {showMobileMenu &&
      <ConvoMenu
        c={c}
        pinnedCount={pinnedCount}
        spaces={spaces}
        onPin={handlePin}
        onStartEdit={() => {setEditTitle(c.title);setEditing(true);}}
        onMoveToSpace={handleMoveToSpace}
        onDelete={() => onDelete(c.id)}
        onClose={() => setShowMobileMenu(false)} />

      }

      {showDesktopMenu &&
      <DesktopConvoMenu
        c={c}
        pinnedCount={pinnedCount}
        spaces={spaces}
        onPin={handlePin}
        onStartEdit={() => {setEditTitle(c.title);setEditing(true);}}
        onMoveToSpace={handleMoveToSpace}
        onDelete={() => onDelete(c.id)}
        onClose={() => setShowDesktopMenu(false)}
        menuPos={menuPos} />

      }

      <div
        ref={itemRef}
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-sm mx-1",
          activeId === c.id ? "bg-[hsl(228,7%,27%)] text-white" : "text-[hsl(220,7%,65%)] hover:bg-[hsl(228,7%,24%)] hover:text-[hsl(220,14%,90%)]"
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchEnd}
        onContextMenu={openMenu}>
        
        {c.is_pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Hash className="h-4 w-4 shrink-0 opacity-60" />}

        {editing ?
        <form onSubmit={handleEditSubmit} className="flex-1 flex items-center gap-1" onClick={(e) => e.preventDefault()}>
            <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 bg-[hsl(228,8%,27%)] text-white text-xs px-1.5 py-0.5 rounded border border-primary/50 focus:outline-none min-w-0"
            onKeyDown={(e) => {if (e.key === 'Escape') {setEditing(false);setEditTitle(c.title);}}} />
          
            <button type="submit" className="p-0.5 text-green-400 hover:text-green-300"><Check className="h-3 w-3" /></button>
            <button type="button" onClick={() => {setEditing(false);setEditTitle(c.title);}} className="p-0.5 text-[hsl(220,7%,50%)] hover:text-white"><X className="h-3 w-3" /></button>
          </form> :

        <>
            <Link
            to={`/chat/${c.id}`}
            className="flex-1 truncate"
            onClick={onClose}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}>
            
              {c.title}
            </Link>
            {activeId === c.id &&
          <button
            onClick={() => setShowSideMenu(true)}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(220,7%,55%)] hover:text-white p-0.5"
            title="Chat options">
            
                <ChevronRight className="h-4 w-4" />
              </button>
          }
          </>
        }
      </div>
    </>);

}

function ConvoGroup({ conversations, spaces, activeId, onClose, onDelete, onUpdate }) {
  const pinnedCount = conversations.filter((c) => c.is_pinned).length;
  const pinned = conversations.filter((c) => c.is_pinned);
  const rest = conversations.filter((c) => !c.is_pinned);
  return (
    <div className="pb-2">
      {pinned.map((c) => <ConvoItem key={c.id} c={c} pinnedCount={pinnedCount} spaces={spaces} onClose={onClose} onDelete={onDelete} onUpdate={onUpdate} activeId={activeId} />)}
      {pinned.length > 0 && rest.length > 0 && <div className="mx-3 my-1 border-t border-[hsl(225,9%,15%)]" />}
      {rest.map((c) => <ConvoItem key={c.id} c={c} pinnedCount={pinnedCount} spaces={spaces} onClose={onClose} onDelete={onDelete} onUpdate={onUpdate} activeId={activeId} />)}
    </div>);

}

export default function ChatSidebar({ conversations, spaces, activeId, onNewChat, onDelete, onClose, onSpaceCreated, onUpdate, refreshTrigger, onAuthChange }) {
  const { showBanner, daysRemaining, dismissBanner } = useGuestMode();
  const location = useLocation();
  const navigate = useNavigate();

  const isSpacesRoute = location.pathname === '/spaces';
  const activeTab = location.pathname.startsWith('/space/') ?
  location.pathname.split('/space/')[1] :
  'home';

  const handleTabClick = (tabId) => {
    if (tabId === 'home') navigate('/');else
    if (tabId !== 'spacerails') navigate(`/space/${tabId}`);
    onClose?.();
  };

  const unassigned = conversations.filter((c) => !c.space_id);
  const spaceConvos = (spaceId) => conversations.filter((c) => c.space_id === spaceId);

  const visibleConvos = activeTab === 'home' ? unassigned : spaceConvos(activeTab);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-black/30 shadow-sm shrink-0">
        <span className="font-bold text-sm text-white tracking-wide">Quillosofi</span>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] transition-colors text-[hsl(220,7%,65%)] hover:text-white" title="New chat">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] transition-colors md:hidden text-[hsl(220,7%,65%)] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab bar - only show if viewing a specific space or home */}
      {!isSpacesRoute && spaces.length > 0 &&
      <div
        className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto shrink-0 border-b border-black/20 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,35%)] [&::-webkit-scrollbar-track]:bg-transparent"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'hsl(220,7%,35%) transparent' }}
        onWheel={(e) => {e.preventDefault();e.currentTarget.scrollBy({ left: e.deltaY, behavior: 'smooth' });}}>
        
          <Tooltip text="This group is where your unassigned chats are">
            <button
            onClick={() => handleTabClick('home')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 whitespace-nowrap',
              activeTab === 'home' ?
              'bg-primary/20 text-primary' :
              'text-[hsl(220,7%,55%)] hover:bg-[hsl(228,7%,27%)] hover:text-white'
            )}>
            
              <Hash className="h-3 w-3" /> chats
            </button>
          </Tooltip>
          {spaces.map((s) =>
        <button
          key={s.id}
          onClick={() => handleTabClick(s.id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 whitespace-nowrap',
            activeTab === s.id ?
            'bg-primary/20 text-primary' :
            'text-[hsl(220,7%,55%)] hover:bg-[hsl(228,7%,27%)] hover:text-white'
          )}>
          
              {s.emoji && (s.emoji.startsWith('http') || s.emoji.startsWith('/')) ?
          <img src={s.emoji} alt={s.name} className="w-3.5 h-3.5 rounded object-cover" /> :
          <span className="text-[11px]">{s.emoji || '📁'}</span>
          } {s.name}
            </button>
        )}
        </div>
      }

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1 pb-4">
        <ConvoGroup
          conversations={visibleConvos}
          spaces={spaces}
          activeId={activeId}
          onClose={onClose}
          onDelete={onDelete}
          onUpdate={onUpdate} />
        
      </div>


      <InAppLogin onAuthChange={onAuthChange} />
    </div>);

}