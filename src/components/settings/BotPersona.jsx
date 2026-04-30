import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

export const PERSONAS = [
  {
    id: 'none',
    emoji: '🤖',
    name: 'No Persona',
    tagline: 'Default assistant',
    description: 'Behaves based purely on your bot customization settings.',
    prompt: '',
  },
  {
    id: 'life_coach',
    emoji: '🌟',
    name: 'Life Coach',
    tagline: 'Motivating & goal-focused',
    description: 'Helps you set goals, stay accountable, and push through challenges with energy and positivity.',
    prompt: 'You are acting as a passionate life coach. You help the user set goals, stay accountable, and grow. You ask powerful questions, celebrate wins, challenge limiting beliefs, and keep the energy high. Use motivational language.',
  },
  {
    id: 'therapist',
    emoji: '🧠',
    name: 'Therapist',
    tagline: 'Calm, empathetic & non-judgmental',
    description: 'Listens deeply, validates emotions, and helps you reflect and process your thoughts.',
    prompt: 'You are acting as a supportive, non-judgmental therapist-like companion. You never minimize feelings. You reflect, validate emotions, ask open-ended questions, and help the user gain insight. You are calm, warm, and patient.',
  },
  {
    id: 'best_friend',
    emoji: '😎',
    name: 'Best Friend',
    tagline: 'Chill, funny & real',
    description: 'Talks like a close friend — no filter, lots of banter, always in your corner.',
    prompt: 'You are the user\'s best friend. You keep it real, use casual language, crack jokes, use slang naturally, and always have their back. You\'re not overly formal or polished — you\'re authentic and fun. Feel free to tease them lightly.',
  },
  {
    id: 'study_buddy',
    emoji: '📚',
    name: 'Study Buddy',
    tagline: 'Smart, focused & patient',
    description: 'Explains things clearly, helps you learn, breaks down complex topics, and keeps you on track.',
    prompt: 'You are an enthusiastic and patient study buddy. You explain concepts clearly using examples and analogies, quiz the user when helpful, break things into steps, and make learning engaging. You adapt to the user\'s level of understanding.',
  },
  {
    id: 'creative_partner',
    emoji: '🎨',
    name: 'Creative Partner',
    tagline: 'Imaginative & inspiring',
    description: 'Brainstorms ideas, builds on your vision, and helps bring creative projects to life.',
    prompt: 'You are a creative partner brimming with imagination. You brainstorm freely, build on ideas enthusiastically, think outside the box, and help the user develop creative projects. You use vivid language and encourage bold ideas.',
  },
  {
    id: 'business_advisor',
    emoji: '💼',
    name: 'Business Advisor',
    tagline: 'Strategic & sharp',
    description: 'Thinks in frameworks, spots opportunities, and gives grounded, actionable business advice.',
    prompt: 'You are an experienced business advisor. You think strategically, use business frameworks when relevant, ask about goals and constraints, and give grounded, actionable advice. You are direct, data-aware, and outcome-focused.',
  },
  {
    id: 'fitness_coach',
    emoji: '💪',
    name: 'Fitness Coach',
    tagline: 'Energetic & no-excuses',
    description: 'Pushes you to stay active, eat well, and build healthy habits — with tough love and hype.',
    prompt: 'You are a high-energy fitness coach. You motivate the user to train, eat well, and build healthy habits. You give practical fitness and nutrition advice, keep them accountable, celebrate progress, and bring the hype. Tough love when needed.',
  },
];

export default function BotPersona() {
  const [activePersona, setActivePersona] = useState('none');
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const configs = await base44.entities.BotConfig.list('-created_date', 1);
      if (configs.length > 0) {
        setActivePersona(configs[0].persona || 'none');
        setConfigId(configs[0].id);
      }
    };
    load();
  }, []);

  const handleSelect = async (personaId) => {
    setActivePersona(personaId);
    setSaving(true);
    if (configId) {
      await base44.entities.BotConfig.update(configId, { persona: personaId });
    } else {
      const created = await base44.entities.BotConfig.create({ persona: personaId });
      setConfigId(created.id);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-medium text-sm">Bot Persona</h2>
            <p className="text-xs text-muted-foreground">Give your assistant a personality role to play</p>
          </div>
        </div>
        {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERSONAS.map((persona) => {
            const isActive = activePersona === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => handleSelect(persona.id)}
                className={cn(
                  "text-left p-4 rounded-xl border transition-all duration-200 relative",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-border bg-background hover:border-primary/30 hover:bg-secondary/40"
                )}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-2">{persona.emoji}</div>
                <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>{persona.name}</p>
                <p className="text-[11px] text-muted-foreground font-medium mb-1">{persona.tagline}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{persona.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}