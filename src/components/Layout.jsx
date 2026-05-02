import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { guestStorage } from '../utils/guestStorage';

import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { app } from '@/api/localClient';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import ChatSidebar from './chat/ChatSidebar.jsx';
import ConfirmDialog from './chat/ConfirmDialog';
import SettingsModal from './SettingsModal';
import StatsPanel from './StatsPanel.jsx';
import SpaceRail from './SpaceRail.jsx';
import GuestExpiredScreen from './guest/GuestExpiredScreen';
import { useGlobalKeybinds } from '@/lib/keybinds';
import { addCustomWord } from '@/lib/customDict';
import { useAiEnabled } from '@/lib/aiState';

import { useGuestMode } from '../hooks/useGuestMode';

// v0.4.18 — routes that only exist while AI is enabled. If AI flips off
// while the user is parked on one of these, the page goes silently dead
// (rail buttons disappear but the AI-only Outlet keeps rendering). Bounce
// back to Quillounge so they land on real writing features.
const AI_ONLY_PREFIXES = ['/spaces', '/space/', '/research', '/chat'];
const isAiOnlyPath = (pathname) =>
  AI_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

export default function Layout() {
  const { isExpired, isGuest, loading: guestLoading } = useGuestMode();
  const [aiEnabled] = useAiEnabled();
  const navigate = useNavigate();
  const location = useLocation();

  // Bounce off AI-only routes the moment AI is disabled. Replace (don't push)
  // so Back doesn't drop them right back into a dead view.
  useEffect(() => {
    if (!aiEnabled && isAiOnlyPath(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [aiEnabled, location.pathname, navigate]);

  useEffect(() => {
    if (isExpired && isGuest) {
      app.entities.BotConfig.list('-created_date', 1).then(configs => {
        if (configs[0]?.user_address) {
          app.entities.BotConfig.update(configs[0].id, { user_address: '' });
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

  // v0.4.18: navigate + location are declared at the top of the component
  // alongside the AI-route bounce effect. Keep params local.
  const params = useParams();
  const activeId = params.conversationId;

  const loadConversations = useCallback(async () => {
    const isAuthed = await app.auth.isAuthenticated();
    if (!isAuthed) {
      setConversations(guestStorage.getConversations().filter(c => !c.is_archived));
      return;
    }
    const data = await app.entities.Conversation.filter(
      { is_archived: false },
      '-created_date',
      100
    );
    setConversations(data);
  }, []);

  const loadSpaces = useCallback(async () => {
    const isAuthed = await app.auth.isAuthenticated();
    if (!isAuthed) {
      setSpaces(guestStorage.getSpaces());
      return;
    }
    const data = await app.entities.ProjectSpace.list('-created_date', 50);
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
    navigate('/chat');
  };

  // Wire global keybinds. Settings + AI Settings are routed through window
  // events so SpaceRail (which owns the modals) picks them up. The dictionary
  // shortcut grabs the current selection and stuffs it into the local store.
  const keybindHandlers = useMemo(() => ({
    openSettings:    () => window.dispatchEvent(new CustomEvent('quillosofi:open-settings')),
    openAiSettings:  () => window.dispatchEvent(new CustomEvent('quillosofi:open-ai-settings')),
    addToDictionary: () => {
      const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
      const word = sel?.toString?.().trim();
      if (!word) return;
      addCustomWord({ word });
    },
    toggleAiDictionary: () => {
      // Pinning toggle from a selection — pinning a freshly-added word puts
      // it in AI vocabulary; on an existing pinned word, this unpins it.
      const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
      const word = sel?.toString?.().trim();
      if (!word) return;
      // Use a dynamic import to avoid circulars; safe because keybinds.js
      // already imports React.
      import('@/lib/customDict').then(mod => {
        const existing = mod.getCustomWord(word);
        if (existing) {
          mod.updateCustomWord(existing.id, { is_pinned: !existing.is_pinned });
        } else {
          mod.addCustomWord({ word, is_pinned: true });
        }
      });
    },
  }), []);
  useGlobalKeybinds(keybindHandlers);

  const handleDelete = (id) => setPendingDelete(id);

  const doDelete = async (id) => {
    const isAuthed = await app.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.updateConversation(id, { is_archived: true });
    } else {
      await app.entities.Conversation.update(id, { is_archived: true });
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
      style={{ background: 'transparent' }}
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

      {/* Left: ChatSidebar - Desktop (AI feature — hidden when AI is off) */}
      {aiEnabled && (
        <div className="hidden md:flex md:w-60 border-r border-border overflow-hidden flex-col chalk-shell-deep">
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
      )}

      {/* Left: ChatSidebar - Mobile Overlay (AI feature — hidden when AI is off) */}
      {aiEnabled && leftSidebarOpen && (
        <>
          <div className={`fixed inset-0 z-40 bg-black/60 md:hidden ${leftSidebarClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`} onClick={closeLeftSidebar} />
          <div className={`fixed left-0 top-0 h-screen w-60 z-50 md:hidden overflow-hidden flex flex-col chalk-shell-deep ${leftSidebarClosing ? 'animate-out slide-out-to-left duration-300' : 'animate-in slide-in-from-left duration-300'}`}>
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
        <div className="md:hidden flex items-center justify-between h-12 px-3 border-b border-border chalk-shell-board">
          {aiEnabled ? (
            <button
              onClick={() => setLeftSidebarOpen(true)}
              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-8" />
          )}
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
      <div className="hidden md:flex md:w-64 border-l border-border overflow-hidden flex-col chalk-shell-deep">
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
          <div className={`fixed right-0 top-0 h-screen w-64 z-50 md:hidden overflow-hidden flex flex-col chalk-shell-deep ${rightSidebarClosing ? 'animate-out slide-out-to-right duration-300' : 'animate-in slide-in-from-right duration-300'}`}>
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