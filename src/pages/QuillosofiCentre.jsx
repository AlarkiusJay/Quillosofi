import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Brain, BookOpen, Grid3x3, Table2, Palette, Shield, Zap, MessageSquare, Search, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Have rich, context-aware conversations with Quillosofi. It remembers your preferences and adapts to your style.',
    color: 'from-blue-500/20 to-blue-600/10',
    accent: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  {
    icon: Brain,
    title: 'Persistent Memory',
    description: 'Quillosofi learns what matters to you. Save facts, preferences, and context that carry across every conversation.',
    color: 'from-purple-500/20 to-purple-600/10',
    accent: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  {
    icon: Grid3x3,
    title: 'Project Spaces',
    description: 'Organize your work into dedicated spaces with custom system prompts, reference links, and shared memory.',
    color: 'from-indigo-500/20 to-indigo-600/10',
    accent: 'text-indigo-400',
    border: 'border-indigo-500/20',
  },
  {
    icon: BookOpen,
    title: 'Canvas Vault',
    description: 'Write, format, and save rich text canvases directly inside your chats. Export to TXT, MD, DOCX, or PDF.',
    color: 'from-green-500/20 to-green-600/10',
    accent: 'text-green-400',
    border: 'border-green-500/20',
  },
  {
    icon: Table2,
    title: 'Spreadsheets',
    description: 'Build and manage live spreadsheets inside your conversations with conditional formatting and cell types.',
    color: 'from-amber-500/20 to-amber-600/10',
    accent: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  {
    icon: Search,
    title: 'Web Search',
    description: 'Ask Quillosofi anything with live internet context — news, research, facts, and real-time information.',
    color: 'from-cyan-500/20 to-cyan-600/10',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  {
    icon: Palette,
    title: 'Full Customization',
    description: 'Choose your theme, font, bot personality, tone, response style, and even create custom AI personas.',
    color: 'from-pink-500/20 to-pink-600/10',
    accent: 'text-pink-400',
    border: 'border-pink-500/20',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data is encrypted, never sold, and always under your control. Export or delete everything at any time.',
    color: 'from-red-500/20 to-red-600/10',
    accent: 'text-red-400',
    border: 'border-red-500/20',
  },
  {
    icon: Zap,
    title: 'Slash Commands',
    description: 'Trigger powerful tools instantly — /canvas, /spreadsheet, /search, and more — right inside any chat.',
    color: 'from-yellow-500/20 to-yellow-600/10',
    accent: 'text-yellow-400',
    border: 'border-yellow-500/20',
  },
  {
    icon: BookOpen,
    title: 'Custom Dictionary',
    description: 'Build your own personal vocabulary. Add words, definitions, and categories. Pin words to inject them passively into every AI conversation — perfect for characters, lore, or specialized terms.',
    color: 'from-teal-500/20 to-teal-600/10',
    accent: 'text-teal-400',
    border: 'border-teal-500/20',
  },
];

export default function QuillosofiCentre() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(228,7%,14%)] text-white overflow-y-auto">

      {/* Back button */}
      <div className="sticky top-0 z-10 flex items-center px-4 py-4 bg-[hsl(228,7%,14%)]/90 backdrop-blur-md border-b border-[hsl(225,9%,16%)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(228,8%,22%)] border border-[hsl(225,9%,20%)] text-sm text-[hsl(220,7%,65%)] hover:text-white active:bg-[hsl(228,8%,27%)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">


        <div className="relative z-10 flex flex-col items-center gap-5 max-w-2xl mx-auto">
          <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-2xl shadow-primary/30">
            <img src="./favicon.svg" alt="Quillosofi" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-[hsl(220,14%,60%)] bg-clip-text text-transparent">
            Quillosofi
          </h1>
          <p className="text-lg md:text-xl text-[hsl(220,14%,65%)] leading-relaxed max-w-xl">
            Your Writing and Creative Companion. Built with Canvases, Custom Dictionary, and More!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <span className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-medium">AI-Powered</span>
            <span className="px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-medium">Memory-Aware</span>
            <span className="px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium">Privacy First</span>
            <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-medium">Fully Customizable</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 px-8 max-w-5xl mx-auto">
        <div className="flex-1 h-px bg-[hsl(225,9%,18%)]" />
        <Star className="h-4 w-4 text-[hsl(220,7%,35%)]" />
        <div className="flex-1 h-px bg-[hsl(225,9%,18%)]" />
      </div>

      {/* Features Grid */}
      <div className="px-6 py-16 max-w-5xl mx-auto">
        <p className="text-xs font-semibold text-[hsl(220,7%,40%)] uppercase tracking-widest text-center mb-10">What Quillosofi Can Do</p>
        <div className="flex flex-col items-center gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`relative rounded-2xl bg-gradient-to-br ${f.color} border ${f.border} p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200 w-full max-w-lg`}
              >
                <div className={`h-9 w-9 rounded-xl bg-[hsl(220,8%,14%)] flex items-center justify-center ${f.accent}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-white mb-1">{f.title}</p>
                  <p className="text-xs text-[hsl(220,7%,55%)] leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-12 px-6 border-t border-[hsl(225,9%,16%)]">
        <p className="text-xs text-[hsl(220,7%,35%)]">Quillosofi — Built with care. Designed for you.</p>
        <p className="text-[10px] text-[hsl(220,7%,28%)] mt-1">© {new Date().getFullYear()} Quillosofi. All rights reserved.</p>
        <p className="text-[10px] text-[hsl(220,7%,28%)] mt-1">Powered by <span className="text-primary/60 font-medium">Base44</span></p>
      </div>
    </div>
  );
}