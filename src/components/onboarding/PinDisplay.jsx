import { useState } from 'react';
import { Copy, Check, ShieldAlert, ArrowRight } from 'lucide-react';

export default function PinDisplay({ pin, onConfirmed }) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Pin display */}
      <div className="bg-[hsl(228,7%,14%)] border-2 border-primary/30 rounded-2xl p-6 text-center space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-primary/70 font-semibold">Your Nexal Token</p>
        <p className="text-3xl font-black tracking-[0.25em] text-white font-mono break-all">{pin}</p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors"
        >
          {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Token</>}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200 leading-relaxed">
          <span className="font-black text-amber-400">Remember that token</span> — it's both your login and password. Do not share it with anyone else. Copy it and keep it somewhere safe.
        </p>
      </div>

      {/* Confirm checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          onClick={() => setConfirmed(!confirmed)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${confirmed ? 'bg-primary border-primary' : 'border-[hsl(225,9%,30%)] group-hover:border-primary/50'}`}
        >
          {confirmed && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-sm text-muted-foreground group-hover:text-white transition-colors">
          I've saved my token somewhere safe
        </span>
      </label>

      <button
        disabled={!confirmed}
        onClick={onConfirmed}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Enter Nexal <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}