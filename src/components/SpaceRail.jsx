import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Settings, Home, Grid3x3, Pencil, Download, BookOpen } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import SpaceModal from './spaces/SpaceModal';
import { base44 } from '@/api/base44Client';
import Tooltip from './Tooltip';

const CHECK_INTERVAL = 5 * 60 * 1000;

function useUpdateCheck() {
  const [updateCount, setUpdateCount] = useState(0);
  const initialEtag = useRef(null);
  const lastEtag = useRef(null);

  useEffect(() => {
    const check = async () => {
      const res = await fetch(`/?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
      const etag = res.headers.get('etag') || res.headers.get('last-modified');
      if (!etag) return;
      if (initialEtag.current === null) {
        initialEtag.current = etag;
        lastEtag.current = etag;
      } else if (etag !== lastEtag.current) {
        lastEtag.current = etag;
        setUpdateCount(prev => prev + 1);
      }
    };
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return updateCount;
}

export default function SpaceRail({ spaces, onSpaceCreated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);

  const updateCount = useUpdateCheck();

  const scrollStyles = `
    .spacerail-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .spacerail-scroll::-webkit-scrollbar { display: none; }
  `;

  const handleSpaceContextMenu = (e, space) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ space, x: rect.right, y: rect.top + rect.height });
  };

  const isHome = location.pathname === '/';
  const isSpacesHome = location.pathname === '/spaces';
  const activeSpaceId = location.pathname.startsWith('/space/') ? location.pathname.split('/space/')[1] : null;

  return (
    <>
      <style>{scrollStyles}</style>
      <div className="flex flex-row items-center h-[52px] w-full shrink-0 gap-0" style={{ background: 'hsl(223, 7%, 16%)' }}>

        {/* Left fixed buttons */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          <Tooltip text="Hub">
            <Link to="/" className="[touch-action:manipulation]">
              <div className={cn(
                "w-11 h-11 md:w-9 md:h-9 rounded-[18px] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 active:brightness-75",
                isHome ? "bg-primary rounded-[10px]" : "bg-[hsl(228,7%,42%)] hover:bg-primary hover:rounded-[10px]"
              )}>
                <Home className="h-4 w-4 text-white" />
              </div>
            </Link>
          </Tooltip>

          <Tooltip text="All Spaces">
            <button
              onClick={() => navigate('/spaces')}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                "w-11 h-11 md:w-9 md:h-9 rounded-[18px] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 active:brightness-75",
                isSpacesHome ? "bg-primary rounded-[10px]" : "bg-[hsl(228,7%,42%)] hover:bg-primary hover:rounded-[10px]"
              )}
            >
              <Grid3x3 className="h-4 w-4 text-white" />
            </button>
          </Tooltip>

          <Tooltip text="Canvas Vault">
            <button
              onClick={() => navigate('/canvas-vault')}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                "w-11 h-11 md:w-9 md:h-9 rounded-[18px] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 active:brightness-75",
                location.pathname === '/canvas-vault' ? "bg-primary rounded-[10px]" : "bg-[hsl(228,7%,42%)] hover:bg-primary hover:rounded-[10px]"
              )}
            >
              <BookOpen className="h-4 w-4 text-white" />
            </button>
          </Tooltip>

          <div className="h-6 w-px bg-[hsl(220,7%,25%)] mx-1" />
        </div>

        {/* Scrollable spaces section */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto spacerail-scroll flex-1 px-2"
          style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', touchAction: 'pan-x' }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (!el) return;
            const startX = e.clientX;
            const startScroll = el.scrollLeft;
            let moved = false;
            const onMove = (ev) => {
              const dx = startX - ev.clientX;
              if (Math.abs(dx) > 4) moved = true;
              el.scrollLeft = startScroll + dx;
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
        >
          {spaces.map(s => {
            const isActive = activeSpaceId === s.id;
            const isImg = s.emoji && (s.emoji.startsWith('http') || s.emoji.startsWith('/'));
            return (
              <Tooltip key={s.id} text={s.name}>
                <Link to={`/space/${s.id}`} onContextMenu={(e) => handleSpaceContextMenu(e, s)} className="flex items-center [touch-action:manipulation]">
                  <div className={cn(
                    "w-11 h-11 md:w-9 md:h-9 rounded-[18px] flex items-center justify-center text-lg transition-all duration-150 cursor-pointer active:scale-90 active:brightness-75 overflow-hidden",
                    isActive ? "bg-primary rounded-[10px]" : "bg-[hsl(228,7%,42%)] hover:bg-primary/80 hover:rounded-[10px]"
                  )}>
                    {isImg
                      ? <img src={s.emoji} alt={s.name} className="w-6 h-6 object-cover rounded" />
                      : (s.emoji || '📁')
                    }
                  </div>
                </Link>
              </Tooltip>
            );
          })}
        </div>

        {/* Right fixed buttons */}
        <div className="flex items-center gap-2 px-3 shrink-0">


          <Tooltip text="Settings">
            <button onClick={() => setShowSettings(true)}
              style={{ touchAction: 'manipulation' }}
              className="relative w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-[18px] bg-[hsl(228,7%,42%)] hover:bg-primary hover:rounded-[10px] flex items-center justify-center transition-all duration-150 text-[hsl(220,7%,80%)] hover:text-white active:scale-90 active:brightness-75">
              <Settings className="h-4 w-4" />
              {updateCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-[hsl(223,7%,16%)]" />
              )}
            </button>
          </Tooltip>
        </div>

      </div>

      {showSpaceModal && (
        <SpaceModal
          initialSpace={editingSpace}
          onClose={() => { setShowSpaceModal(false); setEditingSpace(null); }}
          onSave={(s) => { onSpaceCreated(s); setShowSpaceModal(false); setEditingSpace(null); navigate(`/space/${s.id}`); }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} updateCount={updateCount} />}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            ref={menuRef}
            className="fixed z-[70] bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,12%)] rounded-lg shadow-2xl p-1.5 min-w-40"
            style={{ top: contextMenu.y + 4, left: contextMenu.x - 160 }}
            onClick={() => setContextMenu(null)}
          >
            <button
              onClick={() => { setEditingSpace(contextMenu.space); setShowSpaceModal(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-[hsl(220,7%,80%)] hover:bg-[hsl(228,7%,27%)] hover:text-white transition-colors text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Edit Space
            </button>
          </div>
        </>
      )}
    </>
  );
}