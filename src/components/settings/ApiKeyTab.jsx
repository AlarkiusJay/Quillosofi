import { useState, useEffect } from 'react';
import { Key, ExternalLink, Eye, EyeOff, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOpenRouterKey, setOpenRouterKey } from '@/lib/llm';

/**
 * Settings → API tab.
 * Lets the user paste an OpenRouter key into localStorage so smartInvoke()
 * can call OpenRouter directly instead of going through Base44's slow proxy.
 *
 * Storage key: `quillosofi:openrouterKey` (handled inside lib/llm.js).
 */
export default function ApiKeyTab() {
  const [key, setKey] = useState('');
  const [stored, setStored] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

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
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1600);
  };

  const handleClear = () => {
    setOpenRouterKey('');
    setKey('');
    setStored(false);
  };

  const masked = key ? key.slice(0, 6) + '••••••••' + key.slice(-4) : '';

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
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label={reveal ? 'Hide key' : 'Reveal key'}
            >
              {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button onClick={handleSave} disabled={!key.trim()} size="sm">
            {savedTick ? (
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</span>
            ) : (
              'Save'
            )}
          </Button>
          {stored && (
            <Button onClick={handleClear} size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {stored && !reveal && (
          <p className="text-[11px] text-muted-foreground">
            Stored: <span className="font-mono">{masked}</span>
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-border/60 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">How it works</h4>
        <ul className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-4">
          <li>Once a key is saved, chat &amp; research call OpenRouter directly with streaming — no more sitting around watching a spinner.</li>
          <li>Web grounding (the search-the-web toggle) is supported via OpenRouter's <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">:online</code> plugin.</li>
          <li>Your key never leaves this device. Quillosofi doesn't ship it anywhere except OpenRouter's API.</li>
          <li>Remove the key any time with the trash button — chat falls back to the default proxy automatically.</li>
        </ul>
      </div>
    </div>
  );
}
