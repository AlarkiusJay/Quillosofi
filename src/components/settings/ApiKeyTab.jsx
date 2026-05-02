import { useState, useEffect } from 'react';
import { Key, ExternalLink, Eye, EyeOff, Check, Lock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOpenRouterKey, setOpenRouterKey } from '@/lib/llm';

/**
 * Settings → API tab.
 * Lets the user paste an OpenRouter key into localStorage so smartInvoke()
 * can call OpenRouter directly instead of going direct to the LLM provider.
 *
 * Storage key: `quillosofi:openrouterKey` (handled inside lib/llm.js).
 *
 * v0.4.25 — once a key is saved, the input locks and stays locked. The AI
 * toggle in StatsPanel auto-fetches the stored key when flipped on, so the
 * user never has to re-paste. Use the small "Replace key" link if a key
 * actually rotates (rare).
 */
export default function ApiKeyTab() {
  const [key, setKey] = useState('');
  const [stored, setStored] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const existing = getOpenRouterKey();
    if (existing) {
      setKey(existing);
      setStored(true);
    }
  }, []);

  const handleSave = () => {
    const trimmed = (key || '').trim();
    if (!trimmed) return;
    setOpenRouterKey(trimmed);
    setStored(true);
    setEditing(false);
    setReveal(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1600);
  };

  const handleReplace = () => {
    // keep the saved key in localStorage until they actually save a new one,
    // but let them type over the input to swap it.
    setEditing(true);
    setKey('');
    setReveal(false);
  };

  const masked = key ? key.slice(0, 6) + '••••••••' + key.slice(-4) : '';
  const locked = stored && !editing;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Key className="w-4 h-4 text-foreground" />
          <h3 className="font-semibold text-sm text-foreground">OpenRouter API Key</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Quillosofi can talk to LLMs directly through OpenRouter for way faster responses
          (and access to more models). Paste your key below — it stays on this device only,
          stored in local storage. No key? Stuff just falls back to the default proxy.
        </p>
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
        >
          Get a key from openrouter.ai/keys
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground block">API Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={locked ? 'password' : reveal ? 'text' : 'password'}
              value={locked ? masked : key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-…"
              readOnly={locked}
              disabled={locked}
              aria-readonly={locked}
              className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                locked
                  ? 'bg-muted/40 border-border/60 text-muted-foreground font-mono cursor-not-allowed select-all'
                  : 'bg-background border-border text-foreground'
              }`}
              spellCheck={false}
              autoComplete="off"
            />
            {locked ? (
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                title="Key is saved on this device and locked"
                aria-label="Key locked"
              >
                <Lock className="w-4 h-4" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label={reveal ? 'Hide key' : 'Reveal key'}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          {!locked && (
            <Button onClick={handleSave} disabled={!key.trim()} size="sm">
              {savedTick ? (
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</span>
              ) : (
                'Save'
              )}
            </Button>
          )}
        </div>
        {locked && (
          <div className="flex items-center justify-between text-[11px]">
            <p className="text-muted-foreground">
              Saved on this device. AI features will pull this key automatically when toggled on.
            </p>
            <button
              type="button"
              onClick={handleReplace}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Replace key
            </button>
          </div>
        )}
        {editing && stored && (
          <p className="text-[11px] text-muted-foreground">
            Paste the new key and hit Save. The previous key stays active until you confirm.
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-border/60 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">How it works</h4>
        <ul className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-4">
          <li>Once a key is saved, chat &amp; research call OpenRouter directly with streaming — no more sitting around watching a spinner.</li>
          <li>Web grounding (the search-the-web toggle) is supported via OpenRouter's <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">:online</code> plugin.</li>
          <li>Your key never leaves this device. Quillosofi doesn't ship it anywhere except OpenRouter's API.</li>
          <li>Toggling AI off doesn't drop the key — flip it back on and the same key keeps working.</li>
          <li>Need to swap keys? Hit <span className="font-medium">Replace key</span> above.</li>
        </ul>
      </div>
    </div>
  );
}
