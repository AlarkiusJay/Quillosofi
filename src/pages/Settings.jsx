import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Brain, Trash2, ArrowLeft, Sparkles, Pin, PinOff, Pencil, Check, X, Bot, Sliders } from 'lucide-react';
import BotCustomization from '../components/settings/BotCustomization';
import BotPersona from '../components/settings/BotPersona';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categoryColors = {
  personal: 'bg-blue-500/10 text-blue-600 border-blue-200',
  preference: 'bg-purple-500/10 text-purple-600 border-purple-200',
  context: 'bg-amber-500/10 text-amber-600 border-amber-200',
  interest: 'bg-green-500/10 text-green-600 border-green-200',
};

const categoryLabels = {
  personal: 'Personal',
  preference: 'Preference',
  context: 'Context',
  interest: 'Interest',
};

function MemoryRow({ memory, onDelete, onPin, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(memory.key);
  const [editValue, setEditValue] = useState(memory.value);
  const [editCategory, setEditCategory] = useState(memory.category);

  const handleSave = () => {
    onEdit(memory.id, { key: editKey, value: editValue, category: editCategory });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditKey(memory.key);
    setEditValue(memory.value);
    setEditCategory(memory.category);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-5 py-4 bg-secondary/30 border-b border-border">
        <div className="space-y-2">
          <input
            value={editKey}
            onChange={(e) => setEditKey(e.target.value)}
            placeholder="Memory key"
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Memory value"
            rows={2}
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
          />
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="personal">Personal</option>
            <option value="preference">Preference</option>
            <option value="context">Context</option>
            <option value="interest">Interest</option>
          </select>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs">
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-3 group hover:bg-secondary/50 transition-colors border-b border-border last:border-0",
      memory.is_pinned && "bg-primary/5"
    )}>
      {memory.is_pinned && (
        <Pin className="h-3 w-3 text-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">{memory.key}</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0",
            categoryColors[memory.category] || 'bg-muted text-muted-foreground border-border'
          )}>
            {categoryLabels[memory.category] || memory.category}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{memory.value}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={() => onPin(memory.id, !memory.is_pinned)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            memory.is_pinned
              ? "text-primary hover:text-primary/70"
              : "text-muted-foreground hover:text-primary"
          )}
          title={memory.is_pinned ? "Unpin" : "Pin as important"}
        >
          {memory.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(memory.id)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const load = async () => {
      const [mems, me] = await Promise.all([
        app.entities.UserMemory.filter({}, '-updated_date', 100),
        app.auth.me(),
      ]);
      setMemories(mems);
      setUser(me);
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    await app.entities.UserMemory.delete(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handlePin = async (id, pinned) => {
    await app.entities.UserMemory.update(id, { is_pinned: pinned });
    setMemories(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, is_pinned: pinned } : m);
      // Sort: pinned first
      return [...updated.filter(m => m.is_pinned), ...updated.filter(m => !m.is_pinned)];
    });
  };

  const handleEdit = async (id, data) => {
    await app.entities.UserMemory.update(id, data);
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const handleClearAll = async () => {
    for (const m of memories) await app.entities.UserMemory.delete(m.id);
    setMemories([]);
    setConfirmClear(false);
  };

  const pinned = memories.filter(m => m.is_pinned);
  const unpinned = memories.filter(m => !m.is_pinned);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage what Quillosofi remembers about you</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'general' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="h-4 w-4" /> General
          </button>
          <button
           onClick={() => setActiveTab('persona')}
           className={cn(
             "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
             activeTab === 'persona' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
           )}
          >
           <Bot className="h-4 w-4" /> Bot Persona
          </button>
          </div>

        {activeTab === 'persona' && <BotPersona />}

        {activeTab === 'general' && <>
        {/* User info */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium text-sm">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Bot Customization */}
        <BotCustomization />

        {/* Memory tip */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Keyword Memory Trigger</p>
            <p className="text-xs text-muted-foreground">
              Say <span className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">"save this to your memory"</span>, <span className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">"remember this"</span>, or <span className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">"don't forget"</span> in chat to explicitly save anything.
            </p>
          </div>
        </div>

        {/* Memory Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-medium text-sm">Memory</h2>
                <p className="text-xs text-muted-foreground">
                  {memories.length} items — {pinned.length} pinned
                </p>
              </div>
            </div>
            {memories.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Are you sure?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} className="h-7 text-xs px-2">
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleClearAll} className="h-7 text-xs px-2">
                    Yes, delete all!
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} className="text-destructive hover:text-destructive text-xs">
                  Clear all
                </Button>
              )
            )}
          </div>

          {memories.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No memories yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start chatting and I'll remember important details</p>
            </div>
          ) : (
            <div>
              {pinned.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-primary/5 border-b border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">📌 Pinned</p>
                  </div>
                  {pinned.map(m => (
                    <MemoryRow key={m.id} memory={m} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />
                  ))}
                </>
              )}
              {unpinned.length > 0 && (
                <>
                  {pinned.length > 0 && (
                    <div className="px-5 py-2 bg-secondary/30 border-b border-border">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Other Memories</p>
                    </div>
                  )}
                  {unpinned.map(m => (
                    <MemoryRow key={m.id} memory={m} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        </> }
      </div>
    </div>
  );
}