import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Bot, Save, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERSONALITIES = [
  { value: 'balanced', label: 'Balanced', desc: 'Mix of everything' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm & approachable' },
  { value: 'professional', label: 'Professional', desc: 'Precise & formal' },
  { value: 'witty', label: 'Witty', desc: 'Clever & humorous' },
  { value: 'empathetic', label: 'Empathetic', desc: 'Caring & supportive' },
  { value: 'concise', label: 'Concise', desc: 'Brief & direct' },
];

const TONES = [
  { value: 'casual', label: 'Casual' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'formal', label: 'Formal' },
];

const LENGTHS = [
  { value: 'short', label: 'Short', desc: '1–2 sentences' },
  { value: 'medium', label: 'Medium', desc: 'Balanced' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough & complete' },
];

export default function BotCustomization() {
  const [config, setConfig] = useState({
    bot_name: 'Botify AI',
    personality: 'balanced',
    tone: 'neutral',
    response_length: 'medium',
    custom_instructions: '',
    language: 'English',
  });
  const [configId, setConfigId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const configs = await app.entities.BotConfig.list('-created_date', 1);
      if (configs.length > 0) {
        setConfig({ ...config, ...configs[0] });
        setConfigId(configs[0].id);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    const data = {
      bot_name: config.bot_name,
      personality: config.personality,
      tone: config.tone,
      response_length: config.response_length,
      custom_instructions: config.custom_instructions,
      language: config.language,
    };
    if (configId) {
      await app.entities.BotConfig.update(configId, data);
    } else {
      const created = await app.entities.BotConfig.create(data);
      setConfigId(created.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="h-24 flex items-center justify-center"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-medium text-sm">Bot Customization</h2>
            <p className="text-xs text-muted-foreground">Personalize how your AI assistant behaves</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} className={cn("h-8 text-xs gap-1.5 transition-all", saved && "bg-green-600 hover:bg-green-600")}>
          {saved ? <><Check className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save</>}
        </Button>
      </div>

      <div className="p-5 space-y-6">
        {/* Bot Name */}
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Bot Name</label>
          <input
            value={config.bot_name}
            onChange={e => setConfig(p => ({ ...p, bot_name: e.target.value }))}
            placeholder="e.g. Aria, Max, Nova..."
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Personality */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Personality</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PERSONALITIES.map(p => (
              <button
                key={p.value}
                onClick={() => setConfig(prev => ({ ...prev, personality: p.value }))}
                className={cn(
                  "text-left p-3 rounded-lg border text-sm transition-all",
                  config.personality === p.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/30 hover:bg-secondary/50"
                )}
              >
                <p className="font-medium text-xs">{p.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Tone</label>
          <div className="flex gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setConfig(prev => ({ ...prev, tone: t.value }))}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                  config.tone === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/30"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Response Length */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Response Length</label>
          <div className="flex gap-2">
            {LENGTHS.map(l => (
              <button
                key={l.value}
                onClick={() => setConfig(prev => ({ ...prev, response_length: l.value }))}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-xs transition-all",
                  config.response_length === l.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/30"
                )}
              >
                <p className="font-medium">{l.label}</p>
                <p className="text-[10px] text-muted-foreground">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Preferred Language</label>
          <input
            value={config.language}
            onChange={e => setConfig(p => ({ ...p, language: e.target.value }))}
            placeholder="e.g. English, Spanish, French..."
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Custom Instructions</label>
          <p className="text-[10px] text-muted-foreground mb-2">Anything you want the bot to always know or follow. E.g. "I'm a developer. Always include code examples." or "Keep it fun, use emojis."</p>
          <textarea
            value={config.custom_instructions}
            onChange={e => setConfig(p => ({ ...p, custom_instructions: e.target.value }))}
            placeholder="Enter any custom instructions..."
            rows={4}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
          />
        </div>
      </div>
    </div>
  );
}