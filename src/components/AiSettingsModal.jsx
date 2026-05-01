/*
 * AI Settings Modal — opened via the gear+brain icon in the StatsPanel
 * (or via the Ctrl+; keybind).
 *
 * v0.4.2 settings reorg: ALL bot-personality / AI-context / AI-data surfaces
 * live here now. The plain Settings modal keeps only the writing-app
 * essentials (Your Name, theme, keybinds, upgrade, update, generic
 * data + import/export).
 *
 * Tabs:
 *   1. Overview         AI on/off, key, model, retention status; extension toggles
 *   2. Profile          Avatar + bio + links (used as AI personalization context)
 *   3. Bot Customization  Bot name, personality, tone, response length
 *   4. Persona          Pick a Bot Persona (Life Coach, Therapist, etc.)
 *   5. Memory           Saved facts + pinned memories
 *   6. API              OpenRouter key
 *   7. Behavior         System prompt override, temperature, default model
 *   8. Tutorial         Walk-through of @ mentions, Research, Chat, Custom Dict
 *   9. Usage            Token counters / monthly summary / recent calls (local)
 *   10. Privacy         Retention toggle, local-only logs, wipe AI data
 */

import { useEffect, useState, useRef } from 'react';
import {
  X, BookOpen, Key, Activity, Sliders, Shield, Compass,
  Sparkles, MessageSquare, Search, Pin, PinOff, AtSign, Lock, Power, Trash2, Brain,
  User, Bot, Upload, Plus, Pencil, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAiEnabled, useAiRetention, useAiExtensions } from '@/lib/aiState';
import { hasOpenRouterKey } from '@/lib/llm';
import { clearAll as clearDict } from '@/lib/customDict';
import { base44 } from '@/api/base44Client';
import ApiKeyTab from './settings/ApiKeyTab';
import BotCustomization from './settings/BotCustomization';
import BotPersona from './settings/BotPersona';

const TABS = [
  { id: 'overview',   label: 'Overview',         icon: Compass },
  { id: 'profile',    label: 'Profile',          icon: User },
  { id: 'bot',        label: 'Bot Customization', icon: Bot },
  { id: 'persona',    label: 'Persona',          icon: Sparkles },
  { id: 'memory',     label: 'Memory',           icon: Brain },
  { id: 'api',        label: 'API',              icon: Key },
  { id: 'behavior',   label: 'Behavior',         icon: Sliders },
  { id: 'tutorial',   label: 'Tutorial',         icon: BookOpen },
  { id: 'usage',      label: 'Usage',            icon: Activity },
  { id: 'privacy',    label: 'Privacy',          icon: Shield },
];

// ---- Persisted AI behavior settings -----------------------------------
const BEHAVIOR_KEY = 'quillosofi:aiBehavior';
const BEHAVIOR_DEFAULTS = {
  systemPrompt: '',
  temperature: 0.7,
  model: 'gemini-2.5-flash',
};
function getBehavior() {
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) return { ...BEHAVIOR_DEFAULTS };
    return { ...BEHAVIOR_DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...BEHAVIOR_DEFAULTS }; }
}
function saveBehavior(b) {
  try { localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

// ---- Local usage log --------------------------------------------------
const USAGE_KEY = 'quillosofi:aiUsage';
function getUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { total: { input: 0, output: 0, calls: 0 }, recent: [] };
    return JSON.parse(raw);
  } catch { return { total: { input: 0, output: 0, calls: 0 }, recent: [] }; }
}
function clearUsage() { try { localStorage.removeItem(USAGE_KEY); } catch { /* ignore */ } }

// =======================================================================
// Memory subcomponents (migrated from old SettingsModal General tab)
// =======================================================================
const categoryColors = {
  personal: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preference: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  context: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  interest: 'bg-green-500/10 text-green-400 border-green-500/20',
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

  const handleSave = () => {
    onEdit(memory.id, { key: editKey, value: editValue });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="space-y-2">
          <input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="Key"
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" rows={2}
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs"><Check className="h-3 w-3 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs"><X className="h-3 w-3 mr-1" />Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 group hover:bg-secondary/50 transition-colors border-b border-border last:border-0', memory.is_pinned && 'bg-primary/5')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {memory.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
          <span className="text-xs font-medium truncate">{memory.key}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', categoryColors[memory.category] || 'bg-muted text-muted-foreground border-border')}>
            {categoryLabels[memory.category] || memory.category}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{memory.value}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={() => onPin(memory.id, !memory.is_pinned)} className="p-1 rounded transition-colors text-muted-foreground hover:text-primary">
          {memory.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button onClick={() => setEditing(true)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={() => onDelete(memory.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// =======================================================================
// Main modal
// =======================================================================
export default function AiSettingsModal({ onClose, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiEnabled, setAiEnabled] = useAiEnabled();
  const [retention, setRetention] = useAiRetention();
  const [extensions, setExtension] = useAiExtensions();
  const [behavior, setBehavior] = useState(getBehavior);
  const [usage] = useState(getUsage);

  // Profile state (migrated from old SettingsModal Profile tab)
  const [configId, setConfigId] = useState(null);
  const [profilePicture, setProfilePicture] = useState('');
  const [tempProfilePicture, setTempProfilePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [userBio, setUserBio] = useState('');
  const [socials, setSocials] = useState([]);
  const fileInputRef = useRef(null);

  // Memory state
  const [memories, setMemories] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  // Load persisted profile + memories on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [mems, configs] = await Promise.all([
          base44.entities.UserMemory.filter({}, '-updated_date', 100),
          base44.entities.BotConfig.list('-created_date', 1),
        ]);
        setMemories(mems);
        if (configs.length > 0) {
          setProfilePicture(configs[0].profile_picture || '');
          setUserBio(configs[0].user_bio || '');
          setSocials(configs[0].socials || []);
          setConfigId(configs[0].id);
        }
      } catch (err) {
        console.error('AI Settings load error:', err);
      }
    };
    load();
  }, []);

  const updateBehavior = (patch) => {
    const next = { ...behavior, ...patch };
    setBehavior(next);
    saveBehavior(next);
  };

  // ---- profile handlers ------------------------------------------------
  const ensureConfig = async (patch) => {
    if (configId) {
      await base44.entities.BotConfig.update(configId, patch);
      return configId;
    }
    const created = await base44.entities.BotConfig.create(patch);
    setConfigId(created.id);
    return created.id;
  };

  const handleUploadPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTempProfilePicture(file_url);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!tempProfilePicture) return;
    try {
      setProfilePicture(tempProfilePicture);
      await ensureConfig({ profile_picture: tempProfilePicture });
      setTempProfilePicture('');
    } catch (err) {
      console.error('Save picture error:', err);
    }
  };

  const handleBioSave = async () => {
    try { await ensureConfig({ user_bio: userBio }); }
    catch (err) { console.error('Save bio error:', err); }
  };

  const handleAddLink = async () => {
    if (socials.length >= 15) return;
    const updated = [...socials, { title: '', url: '' }];
    setSocials(updated);
    try { await ensureConfig({ socials: updated }); }
    catch (err) { console.error('Add link error:', err); }
  };

  const handleUpdateLink = async (idx, field, value) => {
    const updated = [...socials];
    updated[idx] = { ...updated[idx], [field]: value };
    setSocials(updated);
    try { if (configId) await base44.entities.BotConfig.update(configId, { socials: updated }); }
    catch (err) { console.error('Update link error:', err); }
  };

  const handleRemoveLink = async (idx) => {
    const updated = socials.filter((_, i) => i !== idx);
    setSocials(updated);
    try { if (configId) await base44.entities.BotConfig.update(configId, { socials: updated }); }
    catch (err) { console.error('Remove link error:', err); }
  };

  // ---- memory handlers -------------------------------------------------
  const handleDeleteMem = async (id) => {
    try {
      await base44.entities.UserMemory.delete(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) { console.error('Delete memory error:', err); }
  };

  const handlePinMem = async (id, pinned) => {
    try {
      await base44.entities.UserMemory.update(id, { is_pinned: pinned });
      setMemories((prev) => {
        const updated = prev.map((m) => m.id === id ? { ...m, is_pinned: pinned } : m);
        return [...updated.filter((m) => m.is_pinned), ...updated.filter((m) => !m.is_pinned)];
      });
    } catch (err) { console.error('Pin memory error:', err); }
  };

  const handleEditMem = async (id, data) => {
    try {
      await base44.entities.UserMemory.update(id, data);
      setMemories((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m));
    } catch (err) { console.error('Edit memory error:', err); }
  };

  const handleClearAllMems = async () => {
    try {
      for (const m of memories) await base44.entities.UserMemory.delete(m.id);
      setMemories([]);
      setConfirmClear(false);
    } catch (err) { console.error('Clear memories error:', err); }
  };

  const pinnedMems = memories.filter((m) => m.is_pinned);
  const unpinnedMems = memories.filter((m) => !m.is_pinned);
  const keyConfigured = hasOpenRouterKey();

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-3 top-[8%] bottom-[8%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[920px] md:max-w-[92vw] md:max-h-[84vh] z-[101] flex flex-col rounded-2xl border border-[hsl(225,9%,22%)] shadow-2xl overflow-hidden"
        style={{ background: 'hsl(220, 8%, 14%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(225,9%,18%)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
              <Sliders className="h-4 w-4 text-white absolute opacity-80" style={{ transform: 'translate(-3px, -3px)' }} />
              <Brain className="h-4 w-4 text-white absolute" style={{ transform: 'translate(3px, 3px)' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white">AI Settings</p>
              <p className="text-[11px] text-[hsl(220,7%,55%)]">An optional layer above your writing app</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[hsl(228,7%,25%)] transition-colors text-[hsl(220,7%,65%)] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Layout: sidebar tabs + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab rail */}
          <div className="w-44 md:w-52 shrink-0 border-r border-[hsl(225,9%,18%)] py-3 px-2 overflow-y-auto" style={{ background: 'hsl(220, 8%, 12%)' }}>
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors mb-0.5',
                    activeTab === t.id
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-[hsl(220,7%,60%)] hover:text-white hover:bg-[hsl(228,7%,20%)]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {activeTab === 'overview' && (
              <div className="space-y-4 max-w-xl">
                {!aiEnabled ? (
                  <div className="rounded-xl border border-[hsl(225,9%,22%)] bg-gradient-to-br from-[hsl(220,8%,16%)] to-[hsl(220,8%,12%)] p-6 text-center">
                    <Power className="h-6 w-6 text-[hsl(220,7%,45%)] mx-auto mb-3" />
                    <p className="text-base font-semibold text-white mb-1">AI is currently off</p>
                    <p className="text-xs text-[hsl(220,7%,55%)] mb-4 max-w-sm mx-auto leading-relaxed">
                      Quillosofi works as a writing studio without it. Flip it on whenever you want extras like research, chat, or the highlight popup.
                    </p>
                    <button
                      onClick={() => setAiEnabled(true)}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Turn AI on
                    </button>
                  </div>
                ) : (
                  <>
                    <Row label="AI Status">
                      <span className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Active
                      </span>
                    </Row>
                    <Row label="OpenRouter API key">
                      <span className={cn('text-xs font-medium', keyConfigured ? 'text-green-400' : 'text-amber-400')}>
                        {keyConfigured ? 'Configured' : 'Not set — open the API tab'}
                      </span>
                    </Row>
                    <Row label="Current model">
                      <span className="text-xs text-white font-mono">{behavior.model}</span>
                    </Row>
                    <Row label="Data retention">
                      <span className={cn('text-xs font-medium', retention ? 'text-amber-400' : 'text-green-400')}>
                        {retention ? 'Enabled' : 'Off (recommended)'}
                      </span>
                    </Row>
                  </>
                )}

                <div className="border-t border-[hsl(225,9%,18%)] pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,45%)] font-semibold mb-3">AI Extensions</p>
                  <ExtensionRow icon={MessageSquare} label="Chat" desc="The chat rail tab" enabled={extensions.chat} disabled={!aiEnabled} onChange={(v) => setExtension('chat', v)} />
                  <ExtensionRow icon={Search} label="Research mode" desc="The research rail tab" enabled={extensions.research} disabled={!aiEnabled} onChange={(v) => setExtension('research', v)} />
                  <ExtensionRow icon={Sparkles} label="Highlight popup" desc="Perplexity-style follow-up on selected text in canvases" enabled={extensions.highlightPopup} disabled={!aiEnabled} onChange={(v) => setExtension('highlightPopup', v)} />
                  <ExtensionRow icon={Pin} label="Custom Dictionary AI" desc="Inject pinned words as USER VOCABULARY into prompts" enabled={extensions.customDictionary} disabled={!aiEnabled} onChange={(v) => setExtension('customDictionary', v)} />
                  <ExtensionRow icon={AtSign} label="@ mentions" desc="Pull Quillibrary content into chat (v0.5)" enabled={false} disabled comingSoon />
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4 max-w-xl">
                <p className="text-[11px] text-[hsl(220,7%,55%)] leading-relaxed -mt-1">
                  Personal context the AI sees so it can write more like <em>you</em>. Stays on this device.
                </p>

                {/* Avatar */}
                <div className="bg-[hsl(220,8%,12%)] rounded-xl border border-[hsl(225,9%,22%)] p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-white mb-3 block">Profile Picture</label>
                    <div className="flex items-end gap-4">
                      <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden shrink-0">
                        {tempProfilePicture
                          ? <img src={tempProfilePicture} alt="Profile" className="w-full h-full object-cover" />
                          : profilePicture
                            ? <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            : <User className="h-8 w-8" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          className="hidden"
                          onChange={handleUploadPicture}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(225,9%,22%)] bg-[hsl(220,8%,16%)] hover:border-primary/40 text-xs font-medium text-[hsl(220,7%,75%)] hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        {tempProfilePicture && (
                          <button
                            onClick={handleSaveProfilePicture}
                            className="w-full px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            Save Picture
                          </button>
                        )}
                        <p className="text-[10px] text-[hsl(220,7%,50%)]">PNG or JPG, max 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="bg-[hsl(220,8%,12%)] rounded-xl border border-[hsl(225,9%,22%)] p-4">
                  <label className="text-xs font-medium text-white mb-1.5 block">What Quillosofi should know about you</label>
                  <textarea
                    value={userBio}
                    onChange={(e) => setUserBio(e.target.value)}
                    onBlur={handleBioSave}
                    placeholder="Share your interests, profession, hobbies, goals..."
                    rows={4}
                    className="w-full text-xs bg-[hsl(220,8%,16%)] border border-[hsl(225,9%,22%)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 resize-none"
                  />
                  <p className="text-[10px] text-[hsl(220,7%,50%)] mt-2">Injected as personal context into AI conversations.</p>
                </div>

                {/* Links */}
                <div className="bg-[hsl(220,8%,12%)] rounded-xl border border-[hsl(225,9%,22%)] p-4">
                  <label className="text-xs font-medium text-white mb-2 block">Links</label>
                  <p className="text-[10px] text-[hsl(220,7%,50%)] mb-3">Add reference links (portfolio, social, project pages).</p>
                  <div className="space-y-2">
                    {socials.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[hsl(220,8%,16%)] rounded-lg border border-[hsl(225,9%,22%)] p-2.5">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={link.title || ''}
                            onChange={(e) => handleUpdateLink(idx, 'title', e.target.value)}
                            placeholder="Title"
                            className="text-[11px] bg-[hsl(220,8%,12%)] border border-[hsl(225,9%,22%)] rounded px-2 py-1.5 text-white focus:outline-none focus:border-primary/50"
                          />
                          <input
                            type="text"
                            value={link.url || ''}
                            onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                            placeholder="URL"
                            className="text-[11px] bg-[hsl(220,8%,12%)] border border-[hsl(225,9%,22%)] rounded px-2 py-1.5 text-white focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveLink(idx)}
                          className="p-1 text-[hsl(220,7%,55%)] hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {socials.length === 0 && (
                    <p className="text-[11px] text-[hsl(220,7%,45%)] text-center py-4">No links added yet</p>
                  )}
                  <button
                    onClick={handleAddLink}
                    disabled={socials.length >= 15}
                    className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors mt-3 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add link
                  </button>
                  <p className="text-[10px] text-[hsl(220,7%,45%)] mt-2">{socials.length}/15 links</p>
                </div>
              </div>
            )}

            {activeTab === 'bot' && (
              <div className="max-w-xl">
                <BotCustomization />
              </div>
            )}

            {activeTab === 'persona' && (
              <div className="max-w-2xl">
                <BotPersona />
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="max-w-xl space-y-3">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[hsl(220,7%,65%)]">
                    Say <span className="font-mono bg-[hsl(220,8%,16%)] px-1 py-0.5 rounded text-[10px]">"remember this"</span> in chat to save anything.
                  </p>
                </div>

                <div className="bg-[hsl(220,8%,12%)] rounded-xl border border-[hsl(225,9%,22%)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[hsl(225,9%,22%)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Brain className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-white">Memory</span>
                      <span className="text-xs text-[hsl(220,7%,55%)]">({memories.length})</span>
                    </div>
                    {memories.length > 0 && (confirmClear
                      ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[hsl(220,7%,55%)]">Sure?</span>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} className="h-6 text-xs px-2">No</Button>
                          <Button variant="destructive" size="sm" onClick={handleClearAllMems} className="h-6 text-xs px-2">Yes</Button>
                        </div>
                      )
                      : <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} className="text-red-400 text-xs h-6">Clear</Button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center">
                      <Sparkles className="h-6 w-6 text-[hsl(220,7%,30%)] mx-auto mb-2" />
                      <p className="text-sm text-[hsl(220,7%,55%)]">No memories yet</p>
                    </div>
                  ) : (
                    <div>
                      {pinnedMems.length > 0 && (
                        <>
                          <div className="px-4 py-1.5 bg-primary/5 border-b border-[hsl(225,9%,22%)]">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">📌 Pinned</p>
                          </div>
                          {pinnedMems.map((m) => <MemoryRow key={m.id} memory={m} onDelete={handleDeleteMem} onPin={handlePinMem} onEdit={handleEditMem} />)}
                        </>
                      )}
                      {unpinnedMems.map((m) => <MemoryRow key={m.id} memory={m} onDelete={handleDeleteMem} onPin={handlePinMem} onEdit={handleEditMem} />)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="max-w-xl">
                <ApiKeyTab />
              </div>
            )}

            {activeTab === 'tutorial' && (
              <div className="space-y-5 max-w-2xl">
                <h3 className="text-base font-semibold text-white">Quick walk-through</h3>
                <TutCard
                  icon={Pin}
                  title="Custom Dictionary AI"
                  body={`Open Quillibrary → Custom Dictionary, add personal vocab (characters, places, lore terms). Pin a word and Quillosofi will quietly inject those entries as a "USER VOCABULARY" block at the top of every AI prompt — so it stops fighting your made-up names.`}
                />
                <TutCard
                  icon={Sparkles}
                  title="Highlight popup"
                  body={`Inside Canvas, select a snippet of your draft. A small popup appears: ask a follow-up question or quote it into a chat. The highlight popup lives only on the editor surface and stays out of your way otherwise.`}
                />
                <TutCard
                  icon={Search}
                  title="Research mode"
                  body={`The Research tab is for citation-aware question answering. Type a question and Quillosofi answers with numbered sources you can save into your Sources Vault.`}
                />
                <TutCard
                  icon={MessageSquare}
                  title="Chat"
                  body={`Chat is for the back-and-forth: drafting, brainstorming, weird thought experiments at 2 a.m. Streams in incrementally so you don't have to wait for a full response.`}
                />
                <TutCard
                  icon={AtSign}
                  title="@ mentions (v0.5)"
                  body={`In the next phase, @ inside chat will pull pages from your Quillibrary directly into the AI's context — your own personal RAG, no remote services.`}
                />
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Total calls" value={usage.total.calls.toLocaleString()} />
                  <Stat label="Input tokens" value={usage.total.input.toLocaleString()} />
                  <Stat label="Output tokens" value={usage.total.output.toLocaleString()} />
                </div>
                <div className="rounded-xl border border-[hsl(225,9%,22%)] overflow-hidden">
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[hsl(220,7%,45%)] font-semibold border-b border-[hsl(225,9%,18%)] bg-[hsl(220,8%,12%)]">
                    Recent calls
                  </div>
                  {usage.recent.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-[hsl(220,7%,45%)]">No AI calls logged yet.</p>
                  ) : (
                    <ul className="divide-y divide-[hsl(225,9%,18%)]">
                      {usage.recent.slice(0, 20).map((r, i) => (
                        <li key={i} className="px-3 py-2 text-xs flex items-center gap-2 text-[hsl(220,14%,80%)]">
                          <span className="font-mono text-[10px] text-[hsl(220,7%,50%)]">{r.t || '—'}</span>
                          <span className="truncate flex-1">{r.model}</span>
                          <span className="text-[hsl(220,7%,55%)]">{r.in}+{r.out}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => { clearUsage(); window.location.reload(); }}
                  className="text-[11px] text-[hsl(220,7%,55%)] hover:text-red-400 transition-colors"
                >
                  Clear usage history
                </button>
                <p className="text-[11px] text-[hsl(220,7%,45%)] leading-relaxed">
                  All usage data is stored locally on this machine — Quillosofi does not phone home.
                </p>
              </div>
            )}

            {activeTab === 'behavior' && (
              <div className="space-y-4 max-w-xl">
                <Field label="System prompt override" hint="Leave empty to use Quillosofi's default. This prepends to every AI request.">
                  <textarea
                    value={behavior.systemPrompt}
                    onChange={(e) => updateBehavior({ systemPrompt: e.target.value })}
                    rows={5}
                    placeholder="Optional. e.g. 'You are a thoughtful editor focusing on cadence and clarity...'"
                    className="w-full bg-[hsl(220,8%,12%)] border border-[hsl(225,9%,22%)] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[hsl(220,7%,40%)] focus:outline-none focus:border-primary/50 resize-none"
                  />
                </Field>
                <Field label="Temperature" hint={`Lower = more focused. Higher = more creative. Currently ${behavior.temperature.toFixed(1)}.`}>
                  <input
                    type="range" min="0" max="1.5" step="0.1"
                    value={behavior.temperature}
                    onChange={(e) => updateBehavior({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </Field>
                <Field label="Default model">
                  <select
                    value={behavior.model}
                    onChange={(e) => updateBehavior({ model: e.target.value })}
                    className="w-full bg-[hsl(220,8%,12%)] border border-[hsl(225,9%,22%)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (fast, default)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="claude-sonnet">Claude Sonnet</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="llama-3.3-70b">Llama 3.3 70B</option>
                  </select>
                </Field>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4 max-w-xl">
                <ToggleRow
                  icon={Lock}
                  label="AI data retention"
                  desc="When off, Quillosofi never asks your provider to retain prompts. Default: off."
                  checked={retention}
                  onChange={setRetention}
                />
                <ToggleRow
                  icon={Activity}
                  label="Keep usage log on this device"
                  desc="Stored locally only. Visible on the Usage tab. Off when AI is fully off."
                  checked={!!extensions.localLogs}
                  onChange={(v) => setExtension('localLogs', v)}
                />
                <div className="border-t border-[hsl(225,9%,18%)] pt-4 space-y-2">
                  <button
                    onClick={() => { clearUsage(); alert('Usage history cleared.'); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(225,9%,22%)] text-xs text-[hsl(220,14%,85%)] hover:bg-[hsl(228,7%,20%)] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-amber-400" />
                    Wipe AI usage history
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('This will clear pinned AI dictionary entries as well as the rest of the custom dictionary. Continue?')) {
                        clearDict();
                        alert('Custom dictionary cleared.');
                      }
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Wipe custom dictionary (irreversible)
                  </button>
                </div>
                <p className="text-[11px] text-[hsl(220,7%,45%)] leading-relaxed">
                  Quillosofi never sends your dictionary, vault, or chats anywhere except directly to OpenRouter when AI is on.
                  Even then — your API key, your account, your terms.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[hsl(225,9%,18%)] last:border-0">
      <span className="text-xs text-[hsl(220,7%,60%)]">{label}</span>
      {children}
    </div>
  );
}

function ExtensionRow({ icon: Icon, label, desc, enabled, disabled, onChange, comingSoon }) {
  return (
    <div className={cn('flex items-start gap-3 py-2.5 border-b border-[hsl(225,9%,18%)] last:border-0', disabled && !comingSoon && 'opacity-50')}>
      <Icon className="h-4 w-4 text-[hsl(220,7%,55%)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-white">{label}</p>
          {comingSoon && <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Soon</span>}
        </div>
        <p className="text-[11px] text-[hsl(220,7%,55%)] leading-snug mt-0.5">{desc}</p>
      </div>
      <Switch checked={enabled} disabled={disabled || comingSoon} onCheckedChange={onChange} />
    </div>
  );
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[hsl(225,9%,22%)] bg-[hsl(220,8%,12%)] px-3 py-3">
      <Icon className="h-4 w-4 text-[hsl(220,7%,55%)] shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-[11px] text-[hsl(220,7%,55%)] leading-snug mt-1">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TutCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-xl border border-[hsl(225,9%,22%)] bg-[hsl(220,8%,12%)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <p className="text-xs text-[hsl(220,7%,65%)] leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-[hsl(225,9%,22%)] bg-[hsl(220,8%,12%)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[hsl(220,7%,50%)] font-semibold mb-1">{label}</p>
      <p className="text-lg font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-white mb-1 block">{label}</label>
      {hint && <p className="text-[11px] text-[hsl(220,7%,55%)] mb-2 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}
