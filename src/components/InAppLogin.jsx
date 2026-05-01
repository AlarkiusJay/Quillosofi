import { useState, useEffect, useRef } from 'react';
import { app } from '@/api/localClient';
import { LogIn, LogOut, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

const CURRENT_VERSION = "1.0.0";
const IS_DESKTOP = typeof window !== 'undefined' && !!window.quillosofi?.isDesktop;

// Synthetic local user for desktop — no auth, fully offline-friendly.
const LOCAL_USER = {
  id: 'local-desktop-user',
  email: 'local@quillosofi.desktop',
  full_name: 'Local User',
  is_local: true,
};

export default function InAppLogin({ onAuthChange }) {
  const [user, setUser] = useState(IS_DESKTOP ? LOCAL_USER : null);
  const [botConfig, setBotConfig] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(!IS_DESKTOP);
  const [showSettings, setShowSettings] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const popupRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (IS_DESKTOP) return; // version handled by the desktop AppUpdate component
    app.functions.invoke('getAppVersion', {}).then(res => {
      if (res.data?.version && res.data.version !== CURRENT_VERSION) {
        setHasUpdate(true);
      }
    }).catch(() => {});
  }, []);

  const loadUser = async () => {
    try {
      const isAuthed = await app.auth.isAuthenticated();
      if (isAuthed) {
        const u = await app.auth.me();
        setUser(u);
        const configs = await app.entities.BotConfig.list(null, 1);
        setBotConfig(configs?.[0] || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (IS_DESKTOP) {
      // Desktop: skip auth, just hydrate the bot config (avatar/nickname).
      app.entities.BotConfig.list(null, 1)
        .then((configs) => setBotConfig(configs?.[0] || null))
        .catch(() => {});
      return;
    }
    loadUser();

    // Listen for auth completion from the popup tab
    const handleStorage = (e) => {
      if (e.key === 'zetryl_auth_done') {
        loadUser().then(() => onAuthChange?.());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogin = () => {
    const popup = window.open('/auth-callback', '_blank', 'width=480,height=640');
    popupRef.current = popup;

    // Poll for popup close as fallback
    pollRef.current = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollRef.current);
        loadUser().then(() => onAuthChange?.());
      }
    }, 500);
  };

  const handleLogout = async () => {
    if (IS_DESKTOP) return; // no logout on desktop — it's local-only
    await app.auth.logout();
    setUser(null);
    onAuthChange?.();
  };

  if (loading) return null;

  // Desktop never shows the Login / Sign Up prompt — fully local app.
  if (!user && !IS_DESKTOP) {
    return (
      <div className="shrink-0 px-3 py-3 border-t border-black/30">
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:bg-primary/20"
          style={{ background: 'hsl(235,86%,65%,0.15)', border: '1px solid hsl(235,86%,65%,0.3)' }}
        >
          <LogIn className="h-4 w-4" />
          Login / Sign Up
        </button>
        <p className="text-[10px] text-[hsl(220,7%,40%)] text-center mt-2">Guest mode active</p>
      </div>
    );
  }

  const displayProfilePicture = botConfig?.profile_picture;

  return (
    <>
      <div className="shrink-0 px-3 py-3 border-t border-black/30">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(262,83%,58%)] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {displayProfilePicture
              ? <img src={displayProfilePicture} alt="Profile" className="w-full h-full object-cover" />
              : user.full_name?.charAt(0) || '?'
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{botConfig?.user_address || user.full_name || 'User'}</p>
            <button
              onClick={() => setShowEmail(!showEmail)}
              className="text-[10px] text-[hsl(220,7%,45%)] font-mono truncate hover:text-[hsl(220,7%,55%)] transition-colors cursor-pointer"
            >
              {showEmail ? user.email : '••••••••••••••••'}
            </button>
          </div>
          {!IS_DESKTOP && (
            <button
              onClick={handleLogout}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(220,7%,55%)] hover:text-red-400 p-1 rounded"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} initialTab="update" />}
    </>
  );
}