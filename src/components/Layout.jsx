import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { guestStorage } from '../utils/guestStorage';

import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { app } from '@/api/localClient';
import { cn } from '@/lib/utils';

import StatsPanel from './StatsPanel.jsx';
import SpaceRail from './SpaceRail.jsx';
import GuestExpiredScreen from './guest/GuestExpiredScreen';
import { useGlobalKeybinds } from '@/lib/keybinds';
import { addCustomWord } from '@/lib/customDict';

import { useGuestMode } from '../hooks/useGuestMode';

// v0.4.46 — The Pure Writing Refactor. AI/chat layer fully removed.
// Layout no longer renders ChatSidebar or watches for AI-only routes:
// every surviving route is a pure writing feature.
export default function Layout() {
  const { isExpired, isGuest, loading: guestLoading } = useGuestMode();
  const navigate = useNavigate();
  const location = useLocation();

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

  // navigate + location declared at the top. Keep params local for routes
  // that still need them (notably nothing right now — kept for parity).
  const params = useParams();

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
    loadSpaces();
  }, [loadSpaces]);

  // Wire global keybinds. Settings is routed through a window event so
  // SpaceRail (which owns the modal) picks it up. The dictionary shortcut
  // grabs the current selection and stuffs it into the local store.
  const keybindHandlers = useMemo(() => ({
    openSettings:    () => window.dispatchEvent(new CustomEvent('quillosofi:open-settings')),
    addToDictionary: () => {
      const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
      const word = sel?.toString?.().trim();
      if (!word) return;
      addCustomWord({ word });
    },
  }), []);
  useGlobalKeybinds(keybindHandlers);

  const doDelete = async (id) => {
    // Retained for any future generic delete confirmation flow. Currently
    // unused since the conversation list was removed in v0.4.46.
    setPendingDelete(null);
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

      {/* Center: SpaceRail + Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* SpaceRail - Mobile only, at top */}
        <div className="md:hidden">
          <SpaceRail spaces={spaces} onSpaceCreated={(s) => setSpaces(prev => [s, ...prev])} />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-12 px-3 border-b border-border chalk-shell-board">
          <span className="w-8" />
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
          : <Outlet context={{ spaces, refreshSpaces: loadSpaces }} />}
      </div>

      {/* Right: StatsPanel - Desktop */}
      <div className="hidden md:flex md:w-64 border-l border-border overflow-hidden flex-col chalk-shell-deep">
        <StatsPanel
          spaces={spaces}
          onClose={() => {}}
          onShowHydrationModal={() => setShowHydrationModal(true)}
          onDataUpdate={() => setRefreshTrigger(prev => prev + 1)}
          refreshTrigger={refreshTrigger}
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
              spaces={spaces}
              onClose={() => setRightSidebarOpen(false)}
              onShowHydrationModal={() => setShowHydrationModal(true)}
              onDataUpdate={() => setRefreshTrigger(prev => prev + 1)}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </>
      )}


    </motion.div>
  );
}