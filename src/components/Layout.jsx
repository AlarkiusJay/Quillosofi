import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { guestStorage } from '../utils/guestStorage';

import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import ChatSidebar from './chat/ChatSidebar.jsx';
import ConfirmDialog from './chat/ConfirmDialog';
import SettingsModal from './SettingsModal';
import StatsPanel from './StatsPanel.jsx';
import SpaceRail from './SpaceRail.jsx';
import GuestExpiredScreen from './guest/GuestExpiredScreen';

import { useGuestMode } from '../hooks/useGuestMode';

export default function Layout() {
  const { isExpired, isGuest, loading: guestLoading } = useGuestMode();

  useEffect(() => {
    if (isExpired && isGuest) {
      base44.entities.BotConfig.list('-created_date', 1).then(configs => {
        if (configs[0]?.user_address) {
          base44.entities.BotConfig.update(configs[0].id, { user_address: '' });
        }
      });
    }
  }, [isExpired, isGuest]);
  const [conversations, setConversations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [leftSidebarClosing, setLeftSidebarClosing] = useState(false);
  const [rightSidebarClosing, setRightSidebarClosing] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const closeLeftSidebar = () => {
    setLeftSidebarClosing(true);
    setTimeout(() => {
      setLeftSidebarOpen(false);
      setLeftSidebarClosing(false);
    }, 300);
  };

  const closeRightSidebar = () => {
    setRightSidebarClosing(true);
    setTimeout(() => {
      setRightSidebarOpen(false);
      setRightSidebarClosing(false);
    }, 300);
  };

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    if (!touchStart) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && !leftSidebarOpen) setRightSidebarOpen(true);
    if (isRightSwipe && !rightSidebarOpen) setLeftSidebarOpen(true);
  };

  const navigate = useNavigate();
  const params = useParams();
  const activeId = params.conversationId;

  const loadConversations = useCallback(async () => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      setConversations(guestStorage.getConversations().filter(c => !c.is_archived));
      return;
    }
    const data = await base44.entities.Conversation.filter(
      { is_archived: false },
      '-created_date',
      100
    );
    setConversations(data);
  }, []);

  const loadSpaces = useCallback(async () => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      setSpaces(guestStorage.getSpaces());
      return;
    }
    const data = await base44.entities.ProjectSpace.list('-created_date', 50);
    setSpaces(data);
  }, []);

  const handleAuthChange = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    loadConversations();
    loadSpaces();
  }, [loadConversations, loadSpaces]);

  const handleNewChat = () => {
    navigate('/');
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
    if (activeId === id) navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="h-screen flex flex-col md:flex-row overflow-hidden"
      style={{ background: 'hsl(228, 7%, 20%)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {pendingDelete && (
        <ConfirmDialog
          message="This will delete the chat permanently."
          onConfirm={() => { doDelete(pendingDelete); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showHydrationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowHydrationModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card border border-border rounded-3xl shadow-2xl p-12 max-w-md text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl font-bold text-white mb-3">Hey, take a break! 💧</p>
            <p className="text-lg text-muted-foreground mb-8">Did you take a break yet? Make sure you hydrate!</p>
            <button
              onClick={() => setShowHydrationModal(false)}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors text-base"
            >
              Will do!
            </button>
          </div>
        </div>
      )}

      {/* Left: ChatSidebar - Desktop */}
      <div className="hidden md:flex md:w-60 border-r border-border overflow-hidden flex-col" style={{ background: 'hsl(220, 8%, 18%)' }}>
        <ChatSidebar
          conversations={conversations}
          spaces={spaces}
          activeId={activeId}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          onClose={() => {}}
          onSpaceCreated={(s) => setSpaces(prev => [s, ...prev])}
          onUpdate={loadConversations}
          refreshTrigger={refreshTrigger}
          onAuthChange={handleAuthChange}
        />
      </div>

      {/* Left: ChatSidebar - Mobile Overlay */}
      {leftSidebarOpen && (
        <>
          <div className={`fixed inset-0 z-40 bg-black/60 md:hidden ${leftSidebarClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`} onClick={closeLeftSidebar} />
          <div className={`fixed left-0 top-0 h-screen w-60 z-50 md:hidden overflow-hidden flex flex-col ${leftSidebarClosing ? 'animate-out slide-out-to-left duration-300' : 'animate-in slide-in-from-left duration-300'}`} style={{ background: 'hsl(220, 8%, 18%)' }}>
            <ChatSidebar
              conversations={conversations}
              spaces={spaces}
              activeId={activeId}
              onNewChat={handleNewChat}
              onDelete={handleDelete}
              onClose={closeLeftSidebar}
              onSpaceCreated={(s) => setSpaces(prev => [s, ...prev])}
              onUpdate={loadConversations}
              refreshTrigger={refreshTrigger}
              onAuthChange={handleAuthChange}
            />
          </div>
        </>
      )}

      {/* Center: SpaceRail + Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* SpaceRail - Mobile only, at top */}
        <div className="md:hidden">
          <SpaceRail spaces={spaces} onSpaceCreated={(s) => setSpaces(prev => [s, ...prev])} />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-12 px-3 border-b border-border" style={{ background: 'hsl(220, 8%, 18%)' }}>
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm flex-1 text-center">Quillosofi</span>
          <button
            onClick={() => setRightSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* SpaceRail - Desktop only */}
        <div className="hidden md:block">
          <SpaceRail spaces={spaces} onSpaceCreated={(s) => setSpaces(prev => [s, ...prev])} />
        </div>

        {/* Main Content */}
        {isExpired
          ? <GuestExpiredScreen />
          : <Outlet context={{ conversations, setConversations, loadConversations, spaces }} />}
      </div>

      {/* Right: StatsPanel - Desktop */}
      <div className="hidden md:flex md:w-64 border-l border-border overflow-hidden flex-col" style={{ background: 'hsl(220, 8%, 18%)' }}>
        <StatsPanel
          conversations={conversations}
          spaces={spaces}
          onClose={() => {}}
          onShowHydrationModal={() => setShowHydrationModal(true)}
          onDataUpdate={() => { setRefreshTrigger(prev => prev + 1); loadConversations(); }}
        />
      </div>

      {/* Right: StatsPanel - Mobile Overlay */}
      {rightSidebarOpen && (
        <>
          <div className={`fixed inset-0 z-40 bg-black/60 md:hidden ${rightSidebarClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`} onClick={closeRightSidebar} />
          <div className={`fixed right-0 top-0 h-screen w-64 z-50 md:hidden overflow-hidden flex flex-col ${rightSidebarClosing ? 'animate-out slide-out-to-right duration-300' : 'animate-in slide-in-from-right duration-300'}`} style={{ background: 'hsl(220, 8%, 18%)' }}>
            <div className="flex items-center justify-between h-12 px-3 border-b border-border">
              <span className="font-semibold text-sm">Stats</span>
            </div>
            <StatsPanel
              conversations={conversations}
              spaces={spaces}
              onClose={() => setRightSidebarOpen(false)}
              onShowHydrationModal={() => setShowHydrationModal(true)}
              onDataUpdate={() => { setRefreshTrigger(prev => prev + 1); loadConversations(); }}
            />
          </div>
        </>
      )}


    </motion.div>
  );
}