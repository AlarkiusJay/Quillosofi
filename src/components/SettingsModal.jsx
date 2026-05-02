import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Sparkles, Sliders, Shield, Palette, RefreshCw, Keyboard, MessageSquare, BookOpen, Grid3x3, Table2, Search, Zap, Brain, X } from 'lucide-react';
import AppUpdate from './settings/AppUpdate';
import ImportExport from './settings/ImportExport';
import DataSecurity from './settings/DataSecurity';
import ThemeCustomizer from './settings/ThemeCustomizer';
import UpgradeTab from './settings/UpgradeTab';
import { cn } from "@/lib/utils";
import { useKeybinds, KEYBIND_LABELS, formatBinding, bindingFromEvent, DEFAULT_KEYBINDS } from '@/lib/keybinds';
import { useUserName } from '@/lib/userProfile';
import { useRef } from 'react';

// About section — features list (mirrors src/pages/QuillosofiCentre.jsx)
const ABOUT_FEATURES = [
  { icon: MessageSquare, title: 'AI Chat', description: 'Have rich, context-aware conversations with Quillosofi. It remembers your preferences and adapts to your style.' },
  { icon: Brain, title: 'Persistent Memory', description: 'Quillosofi learns what matters to you. Save facts, preferences, and context that carry across every conversation.' },
  { icon: Grid3x3, title: 'Project Spaces', description: 'Organize your work into dedicated spaces with custom system prompts, reference links, and shared memory.' },
  { icon: BookOpen, title: 'Canvas Vault', description: 'Write, format, and save rich text canvases directly inside your chats. Export to TXT, MD, DOCX, or PDF.' },
  { icon: Table2, title: 'Spreadsheets', description: 'Build and manage live spreadsheets inside your conversations with conditional formatting and cell types.' },
  { icon: Search, title: 'Web Search', description: 'Ask Quillosofi anything with live internet context — news, research, facts, and real-time information.' },
  { icon: Palette, title: 'Full Customization', description: 'Choose your theme, font, bot personality, tone, response style, and even create custom AI personas.' },
  { icon: Shield, title: 'Privacy First', description: 'Your data is encrypted, never sold, and always under your control. Export or delete everything at any time.' },
  { icon: Zap, title: 'Slash Commands', description: 'Trigger powerful tools instantly — /canvas, /spreadsheet, /search, and more — right inside any chat.' },
  { icon: BookOpen, title: 'Custom Dictionary', description: 'Build your own personal vocabulary. Add words, definitions, and categories. Pin words to inject them passively into every AI conversation.' },
];

function KeybindRow({ action, binding, onCapture }) {
  const [capturing, setCapturing] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = bindingFromEvent(e);
      if (!next) return;
      onCapture(action, next);
      setCapturing(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, action, onCapture]);

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border bg-background">
      <span className="text-xs md:text-sm text-foreground">{KEYBIND_LABELS[action] || action}</span>
      <div className="flex items-center gap-2">
        <button
          ref={ref}
          onClick={() => setCapturing((v) => !v)}
          className={cn(
            "px-2 py-1 rounded-md text-[11px] font-mono border transition-colors min-w-24 text-center",
            capturing
              ? "border-primary text-primary bg-primary/10 animate-pulse"
              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          )}
          title="Click then press a key combo to rebind"
        >
          {capturing ? 'Press keys…' : formatBinding(binding)}
        </button>
        <button
          onClick={() => onCapture(action, DEFAULT_KEYBINDS[action])}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Reset to default"
        >
          reset
        </button>
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose, initialTab = 'general', onDataUpdate, updateCount = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [keybinds, setKeybind, resetKeybinds] = useKeybinds();
  const [userName, setUserName] = useUserName();
  const [user, setUser] = useState(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const isAuthed = await app.auth.isAuthenticated();
        if (!isAuthed) {
          setIsLoading(false);
          return;
        }
        const me = await app.auth.me();
        setUser(me);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[80vh] z-50 flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
        style={{ background: 'hsl(var(--chalk-deep) / 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </>);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[80vh] z-50 flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
      style={{ background: 'hsl(var(--chalk-deep) / 0.85)', backdropFilter: 'blur(4px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs md:text-sm overflow-hidden shrink-0">
              {userName?.charAt(0) || user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs md:text-sm truncate">
                {userName || user?.full_name || 'Settings'}
              </p>
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="text-[10px] md:text-xs text-muted-foreground font-mono truncate hover:text-foreground transition-colors cursor-pointer"
                title="Click to toggle email visibility">
                {showEmail ? user?.email : '••••••••••••••••'}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 md:p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 md:gap-1 p-1 md:p-1.5 mx-2 md:mx-4 mt-2 md:mt-4 mb-2 md:mb-3 bg-secondary rounded-xl shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,30%)] [&::-webkit-scrollbar-thumb]:rounded-full">
          {[
          { id: 'general', label: 'General', icon: Sliders },
          { id: 'customize', label: 'Customize', icon: Palette },
          { id: 'data', label: 'Data & Security', icon: Shield },
          { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
          { id: 'upgrade', label: '⚡ Upgrade', icon: Sparkles },
          { id: 'update', label: 'Update', icon: RefreshCw, badge: updateCount > 0 }].
          map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 md:gap-2 py-1.5 md:py-1.5 px-1 md:px-3 rounded-lg text-[8px] md:text-xs font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <span className="relative">
                  <IconComponent className="h-3.5 w-3.5 shrink-0" />
                  {tab.badge && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400" />}
                </span>
                <span className="text-[8px] md:text-xs leading-tight">{tab.label}</span>
              </button>);
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-3 md:pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,35%)] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,45%)]">
          {activeTab === 'general' &&
          <div className="py-3 md:py-4 space-y-3 md:space-y-4">
              <div className="bg-card rounded-xl border border-border p-3 md:p-4">
                <label className="text-xs font-medium text-foreground mb-1.5 block">Your name</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="How Quillosofi greets and addresses you"
                  className="w-full text-xs md:text-sm bg-background border border-border rounded-lg px-3 py-1.5 md:py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5">Drives the time-aware greeting on your home page and how Quillosofi addresses you in chat.</p>
              </div>
            </div>
          }

          {activeTab === 'customize' &&
          <div className="py-3 md:py-4 space-y-6">
              <ThemeCustomizer />
            </div>
          }

          {activeTab === 'data' &&
          <div className="py-3 md:py-4 space-y-3 md:space-y-5">
              <DataSecurity />
              <div className="border-t border-border pt-3 md:pt-5" />
              <ImportExport />
            </div>
          }

          {activeTab === 'keybinds' &&
          <div className="py-3 md:py-4 space-y-3">
              <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground">Keyboard shortcuts</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Click a binding, then press the new key combo. Modifiers (Ctrl/Alt/Shift/Cmd) are recorded.</p>
                  </div>
                  <button
                    onClick={resetKeybinds}
                    className="text-[10px] md:text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
                  >
                    Reset all
                  </button>
                </div>
                <div className="space-y-1.5">
                  {Object.keys(keybinds).map((action) => (
                    <KeybindRow
                      key={action}
                      action={action}
                      binding={keybinds[action]}
                      onCapture={(a, b) => setKeybind(a, b)}
                    />
                  ))}
                </div>
              </div>

              {/* About Quillosofi — mirrors QuillosofiCentre features */}
              <div className="bg-card rounded-xl border border-border p-3 md:p-4">
                <p className="text-xs md:text-sm font-semibold text-foreground mb-2">About Quillosofi</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ABOUT_FEATURES.map(({ icon: Icon, title, description }) => (
                    <div key={title} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-background">
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground">{title}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Quillosofi v0.4.2 — Writing First. Local-first by design.</p>
              </div>
            </div>
          }

          {activeTab === 'upgrade' && <UpgradeTab />}
          {activeTab === 'update' && <AppUpdate updateCount={updateCount} />}
        </div>
      </div>
    </>);
}
