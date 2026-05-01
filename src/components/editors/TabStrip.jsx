import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// TabStrip — horizontal scrollable tabs for the editor hubs.
//
// Props:
//   tabs        Array<{ id, title, icon? }>
//   activeId    string | null
//   onSelect    (id) => void
//   onClose     (id) => void
//   onNew       () => void   (optional — renders + button when provided)
//   placeholder string       (text for empty state)
export default function TabStrip({ tabs = [], activeId, onSelect, onClose, onNew, placeholder = 'No documents open' }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[hsl(225,9%,14%)] bg-[hsl(220,8%,14%)] shrink-0 overflow-hidden">
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 spacerail-scroll" style={{ scrollbarWidth: 'none' }}>
        {tabs.length === 0 && (
          <span className="px-2 text-[10px] text-[hsl(220,7%,40%)] italic">{placeholder}</span>
        )}
        {tabs.map(t => {
          const active = t.id === activeId;
          return (
            <div
              key={t.id}
              onClick={() => onSelect?.(t.id)}
              className={cn(
                'group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md text-xs font-medium cursor-pointer transition-all max-w-[180px] shrink-0 border',
                active
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,22%)] border-transparent'
              )}
            >
              {t.icon && <span className="text-xs shrink-0">{t.icon}</span>}
              <span className="truncate">{t.title || 'Untitled'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClose?.(t.id); }}
                className={cn(
                  'h-4 w-4 rounded flex items-center justify-center transition-colors shrink-0',
                  active
                    ? 'text-primary/80 hover:bg-primary/25 hover:text-white'
                    : 'opacity-0 group-hover:opacity-100 text-[hsl(220,7%,55%)] hover:bg-[hsl(228,7%,30%)] hover:text-white'
                )}
                aria-label="Close tab"
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      {onNew && (
        <button
          onClick={onNew}
          title="New document"
          className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,25%)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
