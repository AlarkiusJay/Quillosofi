import { useState } from 'react';
import { X, Zap, Infinity, Check } from 'lucide-react';
import { app } from '@/api/localClient';

const isInIframe = window.self !== window.top;

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$7.99',
    icon: <Zap className="h-5 w-5 text-amber-400" />,
    color: 'amber',
    features: ['3 connectors', 'Priority responses', 'All AI models', 'Unlimited chats'],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$14.99',
    icon: <Infinity className="h-5 w-5 text-primary" />,
    color: 'primary',
    features: ['Unlimited connectors', 'Priority responses', 'All AI models', 'Unlimited chats', 'Early access features'],
    recommended: true,
  },
];

export default function UpgradeModal({ onClose }) {
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (planId) => {
    if (isInIframe) {
      alert('Checkout is only available from the published app. Please open the app directly.');
      return;
    }
    setLoading(planId);
    const res = await app.functions.invoke('createCheckout', { plan: planId });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert('Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative rounded-2xl shadow-2xl p-6 max-w-md w-full"
        style={{ background: 'hsl(var(--chalk-deep) / 0.85)', backdropFilter: 'blur(4px)', border: '1px solid hsl(var(--chalk-white-faint) / 0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[hsl(220,7%,50%)] hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Upgrade Quillosofi</h2>
        <p className="text-sm text-[hsl(220,7%,55%)] mb-5">Unlock more power. Cancel anytime.</p>

        <div className="space-y-3">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="rounded-xl p-4 border transition-all"
              style={{
                background: 'hsl(var(--chalk-board-alt) / 0.7)',
                border: plan.recommended ? '1px solid hsl(235, 86%, 65%, 0.5)' : '1px solid hsl(var(--chalk-white-faint) / 0.25)',
              }}
            >
              {plan.recommended && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Recommended</span>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {plan.icon}
                  <span className="font-semibold text-white">{plan.name}</span>
                </div>
                <span className="text-white font-bold">{plan.price}<span className="text-xs text-[hsl(220,7%,50%)] font-normal">/mo</span></span>
              </div>
              <ul className="space-y-1 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[hsl(220,7%,70%)]">
                    <Check className="h-3 w-3 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={!!loading}
                className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: plan.recommended ? 'hsl(235, 86%, 65%)' : 'hsl(228, 7%, 30%)',
                  color: 'white',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading === plan.id ? 'Redirecting…' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}