import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Pin, Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useCustomDict } from '@/lib/customDict';
import { isExtensionActive, useAiEnabled, useAiExtensions } from '@/lib/aiState';

function WordRow({ word, onDelete, onTogglePin, onUpdate, aiActive }) {
  const [editing, setEditing] = useState(false);
  const [def, setDef] = useState(word.definition || '');
  const [cat, setCat] = useState(word.category || '');

  const save = async () => {
    onUpdate(word.id, { definition: def, category: cat });
    setEditing(false);
  };

  const cancel = () => {
    setDef(word.definition || '');
    setCat(word.category || '');
    setEditing(false);
  };

  return (
    <div className={cn(
      "group px-4 py-3 border-b border-[hsl(225,9%,14%)] hover:bg-[hsl(228,7%,22%)] transition-colors",
      word.is_pinned && "border-l-2 border-l-primary"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{word.word}</span>
            {word.category && !editing && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{word.category}</span>
            )}
            {word.is_pinned && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                aiActive ? "bg-purple-500/15 text-purple-400" : "bg-[hsl(228,7%,30%)] text-[hsl(220,7%,55%)]"
              )}>
                {aiActive ? 'AI Context' : 'Pinned (AI off)'}
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={cat}
                onChange={e => setCat(e.target.value)}
                placeholder="Category (e.g. character, place, term)"
                className="w-full bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,20%)] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50"
              />
              <textarea
                value={def}
                onChange={e => setDef(e.target.value)}
                placeholder="Definition or notes..."
                rows={2}
                className="w-full bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,20%)] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={save} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">
                  <Check className="h-3 w-3" /> Save
                </button>
                <button onClick={cancel} className="px-3 py-1 rounded-lg bg-[hsl(228,7%,25%)] text-[hsl(220,7%,60%)] text-xs hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            word.definition && <p className="text-xs text-[hsl(220,7%,55%)] mt-1 leading-relaxed">{word.definition}</p>
          )}

          <p className="text-[10px] text-[hsl(220,7%,35%)] mt-1.5">
            Added {word.created_date ? format(new Date(word.created_date), 'MMM d, yyyy') : ''}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!editing && (
            <button onClick={() => setEditing(true)} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors" title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onTogglePin(word)}
            title={word.is_pinned ? 'Remove from AI context' : 'Inject into AI context'}
            className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", word.is_pinned ? "text-primary" : "text-[hsl(220,7%,45%)] hover:text-primary")}
          >
            <Pin className="h-3.5 w-3.5" fill={word.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onDelete(word)} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-red-400 transition-colors" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomDictionary() {
  const { words, add, update, remove, togglePin } = useCustomDict();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [aiEnabled] = useAiEnabled();
  const [extensions] = useAiExtensions();
  // The "AI Context" pill only lights up when both global AI and the
  // Custom Dictionary AI extension are on. Otherwise pinned words still exist
  // (so the user keeps their list across AI on/off cycles) but we make it
  // visually clear they aren't being injected anywhere right now.
  const aiDictActive = !!aiEnabled && !!extensions?.customDictionary;

  const handleAdd = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    add({ word: trimmed });
    setNewWord('');
    setShowAdd(false);
  };

  const handleDelete = (word) => {
    if (!confirm(`Delete "${word.word}" from dictionary?`)) return;
    remove(word.id);
  };

  const handleTogglePin = (word) => {
    togglePin(word.id);
  };

  const handleUpdate = (id, data) => {
    update(id, data);
  };

  const filtered = useMemo(() => {
    let result = [...words];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(w => w.word?.toLowerCase().includes(q) || w.definition?.toLowerCase().includes(q) || w.category?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return a.word?.localeCompare(b.word || '') || 0;
    });
    return result;
  }, [words, search]);

  const pinnedCount = words.filter(w => w.is_pinned).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(225,9%,14%)] shrink-0 bg-[hsl(220,8%,17%)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(220,7%,40%)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dictionary..."
            className="w-full bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,18%)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50" />
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Word</span>
        </button>
      </div>

      {/* Add word bar */}
      {showAdd && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(225,9%,14%)] bg-[hsl(220,8%,15%)]">
          <input
            autoFocus
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder="Type a word and press Enter..."
            className="flex-1 bg-[hsl(228,8%,22%)] border border-primary/40 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none"
          />
          <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">Add</button>
          <button onClick={() => setShowAdd(false)} className="h-7 w-7 flex items-center justify-center text-[hsl(220,7%,45%)] hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2.5 border-b border-[hsl(225,9%,14%)] bg-[hsl(220,8%,16%)] flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-[hsl(220,7%,45%)]">{words.length} words total</span>
        <span className={cn("text-[11px]", aiDictActive ? "text-purple-400" : "text-[hsl(220,7%,45%)]")}>
          <Pin className="h-2.5 w-2.5 inline mr-1" fill="currentColor" />
          {pinnedCount} pinned {aiDictActive ? '· in AI context' : '· AI off'}
        </span>
        <span className="text-[10px] text-[hsl(220,7%,35%)]">· Right-click any word in a canvas to add or pin it</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="text-4xl mb-3">📖</span>
            <p className="text-sm font-medium text-white mb-1">{search ? 'No words match your search' : 'Your dictionary is empty'}</p>
            <p className="text-xs text-[hsl(220,7%,45%)]">{search ? 'Try a different term' : 'Right-click any word in a canvas, or add manually above'}</p>
          </div>
        ) : (
          filtered.map(w => (
            <WordRow key={w.id} word={w} onDelete={handleDelete} onTogglePin={handleTogglePin} onUpdate={handleUpdate} aiActive={aiDictActive} />
          ))
        )}
      </div>
    </div>
  );
}
