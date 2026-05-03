/*
 * Quillosofi changelog — bundled with the app at build time.
 *
 * Each entry corresponds to a tagged release. The Update tab's Changelog
 * panel reads from here and displays entries up through the installed
 * version (so an older build never shows changes that don't exist in it).
 *
 * Conventions:
 *   - `version`  must match the SemVer in package.json for that release.
 *   - `date`     ISO date string. Use the actual tag date.
 *   - `tagline`  one-liner. Shows next to the version chip.
 *   - `changes`  array of strings. Each is a single user-facing change.
 *                Keep them concise — the panel renders them as bullets.
 *
 * Newest first. The component reverses-by-version safely either way, but
 * keeping the source ordered makes diffs readable.
 */
export const CHANGELOG = [
  {
    version: '0.4.26',
    date: '2026-05-03',
    tagline: 'Word-style toolbar wins on Canvas — font size, alignment, line spacing, indent, outline.',
    changes: [
      'New font-size dropdown on the Canvas toolbar (12 / 14 / 16 / 18 / 20 / 24 / 32 / 48 px) — select text and resize.',
      'Alignment cluster: Left / Center / Right / Justify, four crisp toolbar buttons.',
      'Line spacing dropdown: 1.0 / 1.15 / 1.5 / 2.0 / 2.5 / 3.0 — applied per-block, just like Word.',
      'Indent in / out buttons — plus the Tab key indents and Shift-Tab outdents the current paragraph (max 8 levels). No more Tab jumping out of the editor.',
      'New collapsible Outline rail (right side of Canvas) auto-lists every H1/H2/H3 in your document. Click any heading to scroll there. Hidden by default — hit the tree icon top-right to show it.',
      'Toolbar reskinned to chalk palette — translucent panel with chalkboard texture bleeding through, chalk-yellow active state.',
    ],
  },
  {
    version: '0.4.25',
    date: '2026-05-02',
    tagline: 'OpenRouter key locks in once — toggle AI off/on without re-pasting.',
    changes: [
      'Once you save your OpenRouter API key, it stays in this device\'s local data forever and the input field locks down. Flipping AI off and back on pulls the same key automatically — no more re-pasting every session.',
      'Replaced the trash button with a small "Replace key" link for the rare case your OpenRouter key actually rotates. The previous key stays active until you confirm the new one.',
      'Locked input shows a lock icon and masked preview so you can confirm what\'s saved without ever revealing it again.',
    ],
  },
  {
    version: '0.4.24',
    date: '2026-05-02',
    tagline: 'Killed the obnoxious yellow focus border on canvas editors.',
    changes: [
      'Removed the chalk-yellow focus outline that was wrapping the canvas writing area (and following the cursor around when you clicked into different paragraphs). Vault canvas + chat-side canvas both fixed.',
      'The cursor itself is the focus indicator now — no more highlighter box screaming at you while you write.',
    ],
  },
  {
    version: '0.4.23',
    date: '2026-05-02',
    tagline: 'Theme propagation + Chat welcome cards as sticky notes.',
    changes: [
      'Welcome cards in Chat (Tell me about yourself / Remember my preferences / Help me brainstorm) are now sticky notes — manila, mint, and pink paper with thumbtacks and natural per-card rotation.',
      'Purple-to-violet gradients across Space rail icons, stats panel, and AI settings retinted to chalk-yellow → chalk-pink so they belong on the chalkboard.',
      'Modal backgrounds (Settings, Upgrade, AI Settings, Chat header) now use translucent chalk-deep with backdrop blur — the chalkboard texture bleeds through instead of getting painted over.',
      'Drag placeholder + resize handles on Quillounge are chalk-yellow now, no more leftover purple.',
      'Custom Dictionary AI badges, the spreadsheet "A" indicator, and the Data Security accent retuned to the chalk palette.',
    ],
  },
  {
    version: '0.4.22',
    date: '2026-05-02',
    tagline: 'Thumbtacks pop — no more flat-clipped semicircles.',
    changes: [
      'Thumbtacks now pop above the sticky note top edge instead of being sliced flat against the rounded paper.',
      'Beefed up the tack itself: bigger glossy dome, top highlight, cast shadow grounding it to the paper for proper tactile depth.',
    ],
  },
  {
    version: '0.4.21',
    date: '2026-05-02',
    tagline: 'Chalkboard everywhere + sticky text that actually reads.',
    changes: [
      'Chalkboard texture now extends to the WHOLE app: sidebars, top bar, rails, and mobile overlays. The opaque dark-gray panels that were blocking the texture are gone.',
      'Sticky note text adapts to the paper color — dark ink on Manila / Mint / Pink / Lavender / Aged / Blue, no more white-on-pastel washout.',
      'Inner widget content (Greeting, To Do, Today\'s Prompt, Pinned\u00b7Recent\u00b7Stats) re-themed to ink colors so it reads on every swatch.',
      'Stats / Library / Plugins right-rail cards retinted so they sit on the chalkboard instead of painting over it.',
    ],
  },
  {
    version: '0.4.20',
    date: '2026-05-02',
    tagline: 'Chalkboard redesign — widgets are sticky notes now.',
    changes: [
      'New look: the whole app sits on a deep-green chalkboard surface.',
      'Widgets on Quillounge are now pinned sticky notes — thumbtack at the top, soft paper shadow, slight per-widget tilt.',
      'Per-widget paper colors: Manila, Mint, Pink, Lavender, Aged, Blue. Pick yours from the sticky settings (the slider icon on each note).',
      'Existing widget themes (glass / rose / teal / etc.) auto-map to the closest sticky color so your customizations carry over.',
      'Accent color shifted from purple to chalk-yellow across the app.',
      'Two new font choices in the existing font picker: Oldenburg (slab serif, on-theme) and Instrument Serif (editorial).',
      'Lora is still the default — nothing changes for you unless you switch.',
    ],
  },
  {
    version: '0.4.18',
    date: '2026-05-02',
    tagline: 'Toggling AI off now bounces you back to writing features.',
    changes: [
      'Fixed: turning AI off while parked on Spaces, Research, Chat, or a specific Space left you stranded on a dead view (rail buttons disappeared but the AI-only page kept rendering).',
      'Now redirects to Quillounge (Home) the moment AI flips off from any AI-only route.',
      'Uses replace navigation, so Back doesn\u2019t drop you right back into the orphaned page.',
    ],
  },
  {
    version: '0.4.17',
    date: '2026-05-01',
    tagline: 'In-app changelog viewer.',
    changes: [
      'Added a Changelog panel on the Update tab — mirrors the Diagnostic block: collapsed by default, expands inline.',
      'The panel only shows entries up to your installed version, so older builds never advertise newer features.',
      'Each entry has a tag, date, tagline, and a short bullet list of what changed.',
    ],
  },
  {
    version: '0.4.16',
    date: '2026-04-30',
    tagline: 'Drag-highlight in chat preserved; native double-click selection disabled.',
    changes: [
      'Disabled native double-click word selection inside the chat scroll container.',
      'Drag-highlight follow-up flow still works exactly as before.',
    ],
  },
  {
    version: '0.4.15',
    date: '2026-04-29',
    tagline: 'External links bounce to the OS browser instead of navigating in-window.',
    changes: [
      'Hold-to-launch external link flow now opens in the system default browser.',
      'No more accidentally replacing the app shell with a YouTube tab.',
    ],
  },
  {
    version: '0.4.14',
    date: '2026-04-28',
    tagline: 'Removed Windows tray icon (-245 lines). Tray was blocking the installer.',
    changes: [
      'Tray icon removed entirely on Windows — it was holding a file handle on the .exe and blocking NSIS.',
      'Stealth twin prank button removed from the Update tab; tab is now strictly functional.',
    ],
  },
  {
    version: '0.4.13',
    date: '2026-04-27',
    tagline: 'Don\'t kill the process before NSIS launches.',
    changes: [
      'Resolved race condition where windows were being destroyed before NSIS could launch the installer.',
    ],
  },
  {
    version: '0.4.12',
    date: '2026-04-27',
    tagline: 'Smoother button crossfade + (now-removed) twin prank button.',
    changes: [
      'Action button crossfade duration tuned (200ms → 300ms with proper out/in overlap).',
      'Single morphing action button — no more flash on every state change.',
    ],
  },
  {
    version: '0.4.11',
    date: '2026-04-26',
    tagline: 'Fixed NSIS Error 2 by tearing down lingering processes.',
    changes: [
      'Tore down lingering app processes before quitAndInstall so the installer can grab file locks.',
    ],
  },
  {
    version: '0.4.10',
    date: '2026-04-25',
    tagline: 'Killed the visible button flash on update state changes.',
    changes: [
      'Replaced unmount/remount of the action button with a single morphing button.',
      'Status transitions are now buttery instead of pop-flickery.',
    ],
  },
  {
    version: '0.4.9',
    date: '2026-04-24',
    tagline: 'Updater finally loads — moved electron-updater to dependencies.',
    changes: [
      'Moved electron-updater from devDependencies to dependencies so the packaged app actually has it.',
      'Auto-update is now functional end-to-end on packaged builds.',
    ],
  },
  {
    version: '0.4.8',
    date: '2026-04-23',
    tagline: 'Adaptive Quillounge layout in windowed mode.',
    changes: [
      'Quillounge home dashboard adapts per-breakpoint when the window is resized.',
      'Per-breakpoint widget customization is preserved across launches.',
    ],
  },
  {
    version: '0.4.7',
    date: '2026-04-22',
    tagline: 'Dedicated editor hubs with multi-doc tabs and Resume Last.',
    changes: [
      'Canvas and Sheets each got a dedicated hub with a multi-doc tab strip.',
      'Resume Last reopens what you were on when you quit.',
    ],
  },
  {
    version: '0.4.6',
    date: '2026-04-21',
    tagline: 'Update tab gains its full UX.',
    changes: [
      'Update tab now shows installed version, latest, status, release notes, and preferences.',
      'Diagnostic block surfaces updater state for support tickets.',
    ],
  },
];

// Helpers used by the Update tab.

// Strip a leading "v" if present and return the bare semver.
function normalize(v) {
  if (!v) return '';
  return String(v).replace(/^v/i, '').trim();
}

// Compare two semver strings. Returns -1 / 0 / 1 like Array#sort.
// Only handles MAJOR.MINOR.PATCH which is all we ship; pre-release tags
// (-alpha, -rc.1) compare lexically as a fallback.
export function compareVersions(a, b) {
  const [aMain, aPre = ''] = normalize(a).split('-');
  const [bMain, bPre = ''] = normalize(b).split('-');
  const ap = aMain.split('.').map((n) => parseInt(n, 10) || 0);
  const bp = bMain.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const ai = ap[i] ?? 0;
    const bi = bp[i] ?? 0;
    if (ai !== bi) return ai > bi ? 1 : -1;
  }
  // Empty pre-release sorts higher than a pre-release of the same MAJOR.MINOR.PATCH.
  if (aPre === bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  return aPre > bPre ? 1 : -1;
}

// Return all changelog entries up through `installedVersion`, newest first.
// If installedVersion is missing or unparseable, return everything (better
// to over-show during dev than leave the panel mysteriously empty).
export function entriesUpTo(installedVersion) {
  const cap = normalize(installedVersion);
  if (!cap) return [...CHANGELOG];
  return CHANGELOG
    .filter((e) => compareVersions(e.version, cap) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}
