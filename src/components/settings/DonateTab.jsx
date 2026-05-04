/*
 * DonateTab — replaces the old fake "Upgrade" tier-pricing tab in v0.4.45.
 *
 * Quillosofi is fully free + open source. There's no Pro tier, no
 * subscription, no model gate. What there *is* is a real bill: the
 * marketing site (https://www.quillosofi.com) is hosted on Spaceship
 * and the domain renews yearly, plus the cost of building, signing,
 * and shipping desktop installers across three OSes.
 *
 * This tab is a soft Ko-Fi nudge — it explains exactly where the money
 * goes and what it unlocks (next domain renewal, more time to ship
 * features), so a donation feels like buying a thing instead of
 * shouting "support this app" into the void.
 */
import { Coffee, Globe, Heart, Sparkles, ExternalLink } from 'lucide-react';

const KOFI_URL = 'https://ko-fi.com/alarkiusej';
const SITE_URL = 'https://www.quillosofi.com';

// Click handler that prefers Electron's shell.openExternal (so the
// chalkboard surface doesn't get hijacked by a navigation), with a
// graceful window.open fallback for the dev server / web build.
function openExternal(url) {
  return (e) => {
    e.preventDefault();
    if (window.quillosofi?.openExternal) {
      window.quillosofi.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
}

// One row in the "where your support goes" list.
function GoesToRow({ icon: Icon, title, body }) {
  return (
    <li className="flex items-start gap-3">
      <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-sm leading-snug">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
      </div>
    </li>
  );
}

export default function DonateTab() {
  return (
    <div className="py-4 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-11 w-11 rounded-full bg-primary/15 border border-primary/30 items-center justify-center mb-3">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Keep Quillosofi running</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
          Quillosofi is free and stays free. Donations cover the bills that keep it
          installable, updateable, and online — they don't unlock features.
        </p>
      </div>

      {/* The honest bill — what donations actually fund */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Where your support goes
        </p>
        <ul className="space-y-3">
          <GoesToRow
            icon={Globe}
            title="quillosofi.com domain + hosting"
            body="The marketing site lives on Spaceship — domain renewal and hosting are real recurring costs. Donations keep the front door open."
          />
          <GoesToRow
            icon={Sparkles}
            title="More time to ship features"
            body="Quillosofi is built solo. Ko-Fi support directly buys hours that go into the canvas editor, the Tiptap migration, and everything on the v0.5 roadmap."
          />
          <GoesToRow
            icon={Coffee}
            title="Coffee, but literally"
            body="Late-night feature sessions need fuel. No shame in admitting it."
          />
        </ul>
      </div>

      {/* Ko-Fi CTA */}
      <a
        href={KOFI_URL}
        onClick={openExternal(KOFI_URL)}
        className="group flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 bg-[#FF5E5B] hover:bg-[#ff7370] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#FF5E5B]/20"
      >
        <Coffee className="h-4 w-4" />
        Buy me a coffee on Ko-Fi
        <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
      </a>

      {/* Site link — secondary */}
      <a
        href={SITE_URL}
        onClick={openExternal(SITE_URL)}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground text-sm transition-colors"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        Visit quillosofi.com
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </a>

      {/* Footer note */}
      <p className="text-center text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
        No paywalls. No subscriptions. Donations are appreciated, never required.
        <br />
        Thank you for being here. — Alarkius
      </p>
    </div>
  );
}
