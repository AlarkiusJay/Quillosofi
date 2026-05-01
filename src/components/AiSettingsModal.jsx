/*
 * AI Settings Modal — opened via the gear+brain icon in the StatsPanel
 * (or via the Ctrl+; keybind).
 *
 * Six tabs per the v0.4 spec:
 *   1. Overview      Status pane (AI on/off, key, model, retention)
 *   2. Tutorial      Walk-through of @ mentions, Research, Chat, Custom Dict
 *   3. API           OpenRouter key entry (already shipped — reuse ApiKeyTab)
 *   4. Usage         Token counters / monthly summary / recent calls (local)
 *   5. AI Behavior   System prompt overrides, temperature, model picker
 *   6. AI Privacy    Retention toggle, local-only logs, wipe AI history
 *
 * The modal is intentionally separate from SettingsModal — Alaria wanted
 * them to coexist as distinct surfaces.
 */

import { useEffect, useState } from 'react';
import {
  X, BookOpen, Key, Activity, Sliders, Shield, Compass,
  Sparkles, MessageSquare, Search, Pin, AtSign, Lock, Power, Trash2, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useAiEnabled, useAiRetention, useAiExtensions } from '@/lib/aiState';
import { hasOpenRouterKey } from '@/lib/llm';
import { clearAll as clearDict } from '@/lib/customDict';
import ApiKeyTab from './settings/ApiKeyTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'tutorial', label: 'Tutorial', icon: BookOpen },
  { id: 'api',      label: 'API',      icon: Key },
  { id: 'usage',    label: 'Usage',    icon: Activity },
  { id: 'behavior', label: 'AI Behavior', icon: Sliders },
  { id: 'privacy',  label: 'AI Privacy',  icon: Shield },
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

export default function AiSettingsModal({ onClose, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiEnabled, setAiEnabled] = useAiEnabled();
  const [retention, setRetention] = useAiRetention();
  const [extensions, setExtension] = useAiExtensions();
  const [behavior, setBehavior] = useState(getBehavior);
  const [usage] = useState(getUsage);

  const updateBehavior = (patch) => {
    const next = { ...behavior, ...patch };
    setBehavior(next);
    saveBehavior(next);
  };

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
                  body={`In the next phase, @ inside chat will pull pages from your Quillibrary directly into the AI's context — your own personal RAG, no Base44 or external services.`}
                />
              </div>
            )}

            {activeTab === 'api' && (
              <div className="max-w-xl">
                <ApiKeyTab />
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
