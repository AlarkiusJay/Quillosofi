import { Shield, Lock, Database, Eye, RefreshCw, AlertTriangle, Palette, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Section = ({ icon: Icon, title, children, accent = 'text-primary', bg = 'bg-primary/10' }) =>
<div className="bg-card rounded-xl border border-border p-4 space-y-2">
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="text-sm font-semibold">{title}</p>
    </div>
    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
      {children}
    </div>
  </div>;


function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-xs text-primary hover:text-primary/80 font-mono mt-1 inline-flex items-center gap-1.5 transition-colors">
      {email}
      <span className="text-[10px] text-muted-foreground">{copied ? '✓ Copied!' : '(click to copy)'}</span>
    </button>
  );
}

export default function DataSecurity() {
  const navigate = useNavigate();
  return (
    <div className="space-y-3 pb-2">
      <button
        onClick={() => navigate('/quillosofi-centre')}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-primary/15 to-purple-500/10 border border-primary/25 hover:border-primary/50 hover:from-primary/25 hover:to-purple-500/20 transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">✨</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Quillosofi Centre</p>
            <p className="text-[10px] text-[hsl(220,7%,50%)])">Features, info & more</p>
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-primary group-hover:text-white transition-colors" />
      </button>
      <div className="px-1 pb-1">
        <p className="text-xs text-muted-foreground leading-relaxed">This document describes how Quillosofi handles your data, what security measures are in place, and your rights as a user. By using Quillosofi, you agree to these terms.

        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Last updated: April 2026</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Mail className="h-4 w-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1">Contact & Feedback</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For future inquiries, business, feedback, and suggestions, please contact the creator via:
          </p>
          <CopyEmail email="AlarkiusEJ@proton.me" />
        </div>
      </div>

      <Section icon={Database} title="Data We Store" bg="bg-primary/10" accent="text-primary">
        <p>Quillosofi stores the following data on your behalf:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li><strong className="text-foreground/80">Conversations & Messages</strong> — your chat history with Quillosofi, including all messages sent and received.</li>
          <li><strong className="text-foreground/80">AI Memory</strong> — facts and preferences you've explicitly shared or that were inferred from your conversations to personalize responses.</li>
          <li><strong className="text-foreground/80">Bot Configuration</strong> — your settings for personality, tone, language, and custom instructions.</li>
          <li><strong className="text-foreground/80">Project Spaces</strong> — space names, descriptions, system prompts, and attached source links.</li>
        </ul>
        <p>We do <strong className="text-foreground/80">not</strong> collect analytics, sell your data, or share it with third parties outside of what is required to power AI responses.</p>
      </Section>

      <Section icon={Lock} title="How Your Data Is Protected" bg="bg-blue-500/10" accent="text-blue-400">
        <p>All data is encrypted in transit using TLS and encrypted at rest on the Base44 platform. Access to your data is enforced by authenticated user sessions — only you can read or modify your conversations, memories, and settings.</p>
        <p>AI responses are generated via third-party model providers (OpenAI, Anthropic). Your messages are sent to these providers solely for generating responses and are subject to their respective data handling policies. No data is stored by these providers beyond what their standard API terms allow.</p>
      </Section>

      <Section icon={Eye} title="What Quillosofi Sees" bg="bg-amber-500/10" accent="text-amber-400">
        <p>Quillosofi's AI reads your recent conversation history and personal memories to provide context-aware responses. This happens locally within your session — no human reviews your conversations.</p>
        <p>If you use the "Search Web" feature, your query is sent to an external search provider. Be mindful of what you include in web-enhanced prompts.</p>
      </Section>

      <Section icon={RefreshCw} title="Your Rights & Data Control" bg="bg-green-500/10" accent="text-green-400">
        <ul className="list-disc ml-4 space-y-1">
          <li><strong className="text-foreground/80">Export</strong> — you can download a full copy of your data at any time from the Import/Export tab.</li>
          <li><strong className="text-foreground/80">Delete</strong> — you can delete individual conversations, memories, or all data. Deletion is permanent and immediate.</li>
          <li><strong className="text-foreground/80">Modify</strong> — you can edit or pin any memory, rename conversations, and update all settings.</li>
        </ul>
        <p>We do not retain deleted data beyond standard backup rotation periods (typically 30 days).</p>
      </Section>

      <Section icon={AlertTriangle} title="Acceptable Use" bg="bg-red-500/10" accent="text-red-400">
        <p>Quillosofi is intended for personal productivity, research, and creative tasks. You agree not to use Quillosofi to generate harmful, illegal, or deceptive content, attempt to bypass AI safety measures, or use the service to harass or harm others.</p>
        <p>Quillosofi reserves the right to suspend access for users found in violation of these terms.</p>
      </Section>

      <Section icon={Palette} title="What Quillosofi Will Not Do" bg="bg-purple-500/10" accent="text-purple-400">
        <p>No Art Generation — Quillosofi not generate, create, edit, or assist with visual artwork, digital images, or any visual media. Quillosofi is a text-based productivity tool designed for conversation, research, and writing.</p>
        <p><strong className="text-foreground/80">No Misinformation Tools</strong> — Quillosofi will not help create, spread, or refine false, misleading, or deceptive information. We do not assist in generating deepfakes, fraudulent documents, or content designed to manipulate or deceive.</p>
        <p>These commitments protect the integrity of human creativity and the trustworthiness of information.</p>
      </Section>

      <p className="text-[10px] text-muted-foreground/50 text-center px-2 pt-1">
        These terms may be updated periodically. Continued use of Quillosofi constitutes acceptance of any changes.
      </p>
    </div>);

}