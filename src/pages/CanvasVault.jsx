import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import CanvasList from '../components/vault/CanvasList';
import SpreadsheetList from '../components/vault/SpreadsheetList';
import CustomDictionary from '../components/vault/CustomDictionary';

// filter can be: 'pinned' | 'favorites' | 'all_canvases' | 'all_spreadsheets' | 'space:<id>'
export default function CanvasVault() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('all_canvases');
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    app.entities.ProjectSpace.list('-created_date', 50).then(setSpaces);
  }, []);

  const handleFilterClick = (id) => {
    setFilter(id);
    setSidebarOpen(false);
  };

  const topFilters = [
    { id: 'pinned',         label: 'Pinned',              icon: '📌' },
    { id: 'favorites',      label: 'Favorites',           icon: '⭐' },
    { id: 'all_canvases',   label: 'All Canvases',        icon: '📄' },
    { id: 'all_spreadsheets', label: 'All Spreadsheets', icon: '📊' },
    { id: 'dictionary',     label: 'Custom Dictionary',   icon: '📖' },
  ];

  const isCombined = filter === 'pinned' || filter === 'favorites';
  const isSpreadsheets = filter === 'all_spreadsheets';
  const isDictionary = filter === 'dictionary';

  const sectionLabel = topFilters.find(f => f.id === filter)?.label || 'Library';

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left sidebar */}
      <div className={[
        'fixed md:static top-0 left-0 h-full z-50 md:z-auto',
        'w-56 md:w-48 shrink-0',
        'border-r border-[hsl(225,9%,14%)] bg-[hsl(220,8%,16%)]',
        'flex flex-col py-4 px-2 gap-0.5 overflow-y-auto',
        'transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ].join(' ')}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-2">Library</p>
          <button className="md:hidden p-1 text-[hsl(220,7%,50%)] hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {topFilters.map(item => (
          <button key={item.id} onClick={() => handleFilterClick(item.id)}
            className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              filter === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-[hsl(220,7%,60%)] hover:bg-[hsl(228,7%,22%)] hover:text-white'
            )}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}

        {spaces.length > 0 && (
          <>
            <div className="h-px bg-[hsl(225,9%,14%)] my-2 mx-1" />
            <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-2 mb-1">Spaces</p>
            {spaces.map(s => (
              <button key={s.id} onClick={() => handleFilterClick(`space:${s.id}`)}
                className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left truncate',
                  filter === `space:${s.id}`
                    ? 'bg-primary/15 text-primary'
                    : 'text-[hsl(220,7%,60%)] hover:bg-[hsl(228,7%,22%)] hover:text-white'
                )}>
                <span className="shrink-0">{s.emoji || '📁'}</span>
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(225,9%,14%)] shrink-0 bg-[hsl(220,8%,17%)] md:hidden">
          <button
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] text-[hsl(220,7%,60%)] hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-white">{sectionLabel}</span>
        </div>

        {isCombined ? (
          // Show both canvases and spreadsheets for Pinned / Favorites
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-[hsl(225,9%,14%)]">
              <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-5 pt-4 pb-1">📄 Canvases</p>
              <CanvasList filter={filter} spaces={spaces} compact />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest px-5 pt-4 pb-1">📊 Spreadsheets</p>
              <SpreadsheetList filter={filter} compact />
            </div>
          </div>
        ) : isDictionary ? (
          <CustomDictionary />
        ) : isSpreadsheets ? (
          <SpreadsheetList filter="all" />
        ) : (
          <CanvasList filter={filter === 'all_canvases' ? 'all' : filter} spaces={spaces} />
        )}
      </div>
    </div>
  );
}