import { useState } from 'react';
import { Check, Zap, Star, Crown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    icon: Star,
    price: '$0',
    period: 'forever',
    description: 'Get started with Quillosofi',
    color: 'border-border',
    badge: null,
    current: true,
    features: [
      'Unlimited conversations',
      'GPT-4o mini model',
      'Basic memory (50 items)',
      '3 spaces',
      'Guest mode (14 days)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    price: '$7.99',
    period: '/month',
    description: 'For power users who want more',
    color: 'border-primary',
    badge: 'Most Popular',
    current: false,
    features: [
      'Unlimited Chats',
      'Unlimited Spaces',
      'Web Search Included',
      '3 Selected Connectors',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    icon: Crown,
    price: '$14.99',
    period: '/month',
    description: 'The full Quillosofi experience',
    color: 'border-yellow-500/50',
    badge: 'Best Value',
    current: false,
    features: [
      'Unlimited Chats',
      'Unlimited Spaces',
      'All Latest Models',
      'Custom Bot Personas',
      'All Unlocked Connectors & Plugins',
    ],
  },
];

export default function UpgradeTab() {
  const [comingSoon, setComingSoon] = useState(false);

  return (
    <div className="py-4 space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-white">Choose Your Plan</h2>
        <p className="text-xs text-muted-foreground mt-1">Upgrade anytime. Cancel anytime.</p>
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className={cn(
                'relative rounded-xl border p-4 transition-all',
                tier.color,
                tier.current ? 'bg-secondary/30' : 'bg-card hover:border-primary/60'
              )}
            >
              {tier.badge && (
                <span className={cn(
                  'absolute -top-2.5 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full',
                  tier.id === 'pro' ? 'bg-primary text-white' : 'bg-yellow-500 text-black'
                )}>
                  {tier.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    tier.id === 'free' ? 'bg-secondary' :
                    tier.id === 'pro' ? 'bg-primary/20' : 'bg-yellow-500/20'
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      tier.id === 'free' ? 'text-muted-foreground' :
                      tier.id === 'pro' ? 'text-primary' : 'text-yellow-400'
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{tier.name}</p>
                    <p className="text-[11px] text-muted-foreground">{tier.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold text-white">{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {tier.current ? (
                  <div className="w-full py-2 rounded-lg border border-border text-xs text-center text-muted-foreground font-medium">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => setComingSoon(true)}
                    className={cn(
                      'w-full py-2 rounded-lg text-xs font-bold text-white transition-all',
                      tier.id === 'pro'
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    )}
                  >
                    Upgrade to {tier.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground pt-2">
        Payments are secure and encrypted. You can cancel anytime.
      </p>

      {comingSoon && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setComingSoon(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setComingSoon(false)} className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <p className="font-bold text-white text-base mb-1">Coming Soon!</p>
            <p className="text-sm text-muted-foreground">Payments are not available yet. Stay tuned!</p>
            <button onClick={() => setComingSoon(false)} className="mt-4 w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}