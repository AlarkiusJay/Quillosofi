import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import UpgradeModal from './UpgradeModal';
import { Hash, Folder, X, BarChart2, MessageSquare, Library, Plug, Droplets } from 'lucide-react';
import PluginsTab from './settings/PluginsTab';
import LibraryPanel from './LibraryPanel';
import FontSelector from './FontSelector';
import SettingsModal from './SettingsModal';
import { cn } from '@/lib/utils';

function LiveClock({ onShowHydrationModal }) {
  const [now, setNow] = useState(new Date());
  const [clockClicks, setClockClicks] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClockClick = () => {
    const newClicks = clockClicks + 1;
    setClockClicks(newClicks);
    if (newClicks % 2 === 0) {
      onShowHydrationModal();
    }
  };

  return (
    <>
      <div
        onClick={handleClockClick}
        className="rounded-xl p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: 'hsl(228, 7%, 23%)' }}
      >
        <p className="text-2xl font-mono font-bold text-white tracking-widest">
          {format(now, 'HH:mm:ss')}
        </p>
        <p className="text-[11px] text-[hsl(220,7%,50%)] mt-1 font-medium">
          {format(now, 'EEEE, MMM d yyyy')}
        </p>
      </div>
    </>
  );
}

export default function StatsPanel({ conversations, spaces, onClose, onShowHydrationModal, onDataUpdate }) {
  const [tab, setTab] = useState('stats');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const totalMessages = conversations.length;
  const totalSpaces = spaces.length;

  return (
    <div className="h-full flex flex-col w-full md:w-64 shrink-0" style={{ background: 'hsl(220, 8%, 18%)', borderLeft: '1px solid hsl(225, 9%, 12%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-black/30 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => setTab('stats')} className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors',
            tab === 'stats' ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white'
          )}>
            <BarChart2 className="h-3.5 w-3.5" /> Stats
          </button>
          <button onClick={() => setTab('library')} className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors',
            tab === 'library' ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white'
          )}>
            <Library className="h-3.5 w-3.5" /> Library
          </button>
          <button onClick={() => setTab('plugins')} className={cn(
           'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors',
           tab === 'plugins' ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white'
          )}>
           <Plug className="h-3.5 w-3.5" /> Plugins
          </button>
          </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] transition-colors md:hidden text-[hsl(220,7%,65%)] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === 'library' && <LibraryPanel spaces={spaces} />}
      {tab === 'plugins' && <PluginsTab />}
      <div className={cn("flex-1 overflow-y-auto", tab !== 'stats' && 'hidden')}>
        <FontSelector />
        <div className="py-4 px-3 space-y-5">
          {/* Clock */}
          <LiveClock onShowHydrationModal={onShowHydrationModal} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-3" style={{ background: 'hsl(228, 7%, 23%)' }}>
            <MessageSquare className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold text-white">{totalMessages}</p>
            <p className="text-[10px] text-[hsl(220,7%,50%)] font-medium">Conversations</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'hsl(228, 7%, 23%)' }}>
            <Folder className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold text-white">{totalSpaces}</p>
            <p className="text-[10px] text-[hsl(220,7%,50%)] font-medium">Spaces</p>
          </div>
        </div>

        {/* Spaces */}
        {spaces.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-2 px-1">Spaces</p>
            <div className="space-y-1">
              {spaces.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(220,7%,65%)]"
                >
                  <span className="text-base leading-none">{s.emoji || '📁'}</span>
                  <span className="truncate flex-1">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent conversations */}
        {conversations.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-2 px-1">Recent Chats</p>
            <div className="space-y-1">
              {conversations.map(c => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded text-sm text-[hsl(220,7%,65%)]"
                >
                  <Hash className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs">{c.title}</p>
                    {c.created_date && (
                      <p className="text-[10px] text-[hsl(220,7%,40%)]">
                        {format(new Date(c.created_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && spaces.length === 0 && (
          <p className="text-xs text-[hsl(220,7%,45%)] text-center py-8">No history yet</p>
        )}

        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}