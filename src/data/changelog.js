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
    version: '0.6.95-alpha.12',
    date: '2026-05-16',
    tagline: 'Update Available modal — when Check for Updates finds a newer version, a proper prompt appears asking if you’d like to update now or later, instead of silently auto-downloading.',
    changes: [
      'New Update Available modal: when Check for Updates finds a newer version, a fixed full-viewport overlay appears with the new and current version chips, the release tagline (from the bundled changelog or GitHub release notes), and two buttons — Update Now and Later.',
      'Update Now kicks the download immediately and closes the modal. Later dismisses without taking any action — the status block in the Update tab still reflects the available update.',
      'Modal renders via position: fixed at z-[9999] so it always sits above all stacking contexts including the Settings modal itself — never clipped.',
      'Escape key and clicking the backdrop also dismiss the modal (equivalent to Later).',
      'Tagline in the modal is sourced from the bundled changelog entry for the new version if available, otherwise falls back to the first line of GitHub release notes.',
    ],
  },
  {
    version: '0.6.95-alpha.11',
    date: '2026-05-16',
    tagline: 'Changelog is now a proper scrollable panel — no more hunting through a flat collapsed list. Added full entries for alpha.9 and alpha.10.',
    changes: [
      'Changelog panel is now scrollable with a fixed max-height. The entry list no longer pushes the entire Settings modal taller as more releases accumulate.',
      'Added changelog entries for alpha.9 (Quillginate underflow fix) and alpha.10 (updater repo fix).',
    ],
  },
  {
    version: '0.6.95-alpha.10',
    date: '2026-05-16',
    tagline: 'Updater now points at the right repo. Feed URL, owner, and releases link were all hitting AlarkiusJay/Quillosofi (personal profile) instead of the org repo TheAlarklynZone/Quillosofi — so the auto-updater could never find a release. Manual reinstall of alpha.10 is required once; every update after this works automatically.',
    changes: [
      'Fixed: electron-updater feed URL corrected from AlarkiusJay/Quillosofi to TheAlarklynZone/Quillosofi. The updater was silently hitting a non-existent releases feed — Latest seen always showed (not yet seen) regardless of published tags.',
      'Fixed: owner field in electron-builder publish config updated to TheAlarklynZone so future builds generate the correct latest.yml manifest pointing at the org repo.',
      'Fixed: releases page openExternal link in main.cjs updated to match. View all releases on GitHub now opens the correct page.',
      'Includes all changes from alpha.9 (Quillginate underflow fix).',
    ],
  },
  {
    version: '0.6.95-alpha.9',
    date: '2026-05-16',
    tagline: 'Quillginate underflow fixpoint — the alpha.8 blocker. Activating Quillginate on a multi-paragraph document no longer scatters content across empty pages. Blocks now compact upward correctly on every rebalance tick.',
    changes: [
      'Fixed (BLOCKER): Quillginate underflow pull-up was a no-op on freshly-seeded pages. When Quillginate activated, splitDocToBlocks seeded N pages simultaneously. Freshly-mounted PageEditor instances had not yet completed a RAF measurement loop, so heightsRef had no entries for pages 1…N-1. The old guard `if (typeof h !== \'number\') continue` skipped every candidate — the underflow loop exited doing nothing. Overflow kept pushing text forward; underflow never compacted it back. Result: empty pages then scattered content.',
      'Fix: unmeasured pages now treated as height 0 (maximum room) instead of being skipped. A freshly-seeded page that hasn\'t reported yet IS empty — defaulting to 0 is correct and starts the fixpoint chain immediately on activation.',
      'Fix (secondary): added guard to skip pulling from page i+1 only when it is measured AND known-full (hNext > contentHeightPx - SLACK). Unmeasured donor pages are always allowed through — prevents a bounce-back cycle on longer documents.',
      'Hard-page-break logic, measureNaturalContentHeight, and all other pagination behavior unchanged.',
    ],
  },
  {
    version: '0.6.95-alpha.8',
    date: '2026-05-14',
    tagline: 'In-session install prompt with a 5-second countdown you can pause. Pre-alpha.8 the downloaded installer would silently close the app and apply itself with no warning — jarring even when the update actually works. Now you get a modal the moment electron-updater finishes downloading: a big countdown number, Install Now / Later / Pause buttons, the release tagline so you know what’s landing, and a soft fallback (Later defers to the existing 10s next-launch countdown). Pending-install marker is now persisted on every download-finished event, so the safety net survives even an abrupt force-quit.',
    changes: [
      'New install-ready modal pops the moment a downloaded update is ready to install. Shows a 5-second countdown that auto-fires Install Now when it hits zero. Three controls: Install Now (primary CTA, fires immediately), Pause (holds the countdown so you can read the tagline), Later (defers to next launch).',
      'Release tagline is surfaced inside the modal — first non-empty line of the new version’s release notes — so you can decide whether to install now or finish your paragraph first.',
      'Pending-install marker is now persisted on every `update-downloaded` event from electron-updater (was previously defined but never written). When you click Later or close the window mid-countdown, your next launch fires the existing 10s PendingInstallCountdown so the install still happens — nothing is lost.',
      'New preload bridge: `window.quillosofi.updates.onInstallReady(cb)` — subscribes to the `updates:install-ready` IPC ping emitted from main’s update-downloaded handler. Mirrors the existing onPendingInstall shape.',
      'Modal dims the countdown number + progress bar when paused, so the held state reads clearly. Resume restores full color.',
      'Per-version dismissal: hitting Later for v0.6.95-alpha.X suppresses the dialog for that exact version until a NEW update-downloaded fires for a different version. No re-popping on every re-detect.',
    ],
  },
  {
    version: '0.6.95-alpha.7',
    date: '2026-05-14',
    tagline: 'Quillginate pagination, fixed. Activating Quillginate on an existing multi-block doc was shoving every block onto its own page with vast empty space below — the underflow pass that’s supposed to reflow blocks back together couldn’t see the empty space because the editor’s `min-height: 100%` (a UX rule so clicking the empty page area focuses the editor) was clamping `scrollHeight` UP to the page’s writable height. The pager now measures the natural span between the first and last block instead, so empty space is actually visible to the controller. Doubles as the live test for the auto-updater fix shipped in alpha.6 — if you’re reading this in-app via Settings → Update, the updater works.',
    changes: [
      'Quillginate Mode no longer fragments content into one-block-per-page when activated on an existing document. The pagination controller’s underflow detection now sees real empty space and pulls subsequent blocks back to fill the page until it’s honestly full. Single Mode AND Spread Mode both fixed.',
      'Root cause: editor DOM’s `min-height: 100%` CSS rule (kept for the UX affordance of clicking empty page area to focus the editor) was making `scrollHeight` always equal the page’s writable area. The OVERFLOW pass still worked (real overflow pushed scrollHeight past the clamp) but the UNDERFLOW pass computed `room = 0` no matter how empty the page actually was. Pre-Alpha 3 this didn’t bite because Quillginate didn’t auto-split docs into per-block pages on activation; Alpha 3’s `splitDocToBlocks` made it visible.',
      'Fix landed in `TiptapPagedEditor.PageEditor` measurement loop. New helper `measureNaturalContentHeight(dom)` returns the pixel span from the first block’s top to the last block’s bottom (plus outer-edge margins), independent of the editor’s min-height. Quillscript (continuous-single) mode is unaffected — its measurement path is separate.',
      'Quillscript Mode pagination unchanged — already worked correctly because it doesn’t use the per-page overflow controller.',
      'Also: this release is the live test for the auto-updater fix from alpha.6. If your installed Quillosofi auto-detected and installed alpha.7, the channel-filter fix held.',
    ],
  },
  {
    version: '0.6.95-alpha.6',
    date: '2026-05-14',
    tagline: 'Auto-updater fix, for real this time. Alpha 4 set allowPrerelease=true but the tag format was wrong — electron-updater’s GitHubProvider channel-filter is case-sensitive (`["alpha","beta"]`) and our `-AlphaN` suffix never matched, so Alpha 4 installs would silently pick themselves as the latest. Switching the tag format to standard semver prerelease form (`-alpha.N`, lowercase + dot + number) makes the filter pass and unlocks any-direction forward progression: alpha installs find future alphas AND future stable, stable installs find future stable, no downgrades. Plus the download progress bar now reflects real bytes instead of a 1.8s synthetic ramp — speed in KB/s or MB/s, transferred-of-total in bytes/KB/MB, live from electron-updater’s download-progress event.',
    changes: [
      'Version tag format changed to standard semver prerelease form: `v0.6.95-alpha.6` instead of `v0.6.95-Alpha6`. semver.prerelease() now returns ["alpha", 6] so the channel is "alpha" (matches electron-updater’s hardcoded `["alpha","beta"]` whitelist). All future tags follow this convention: `0.7.0-alpha.1`, `0.7.0-beta.1`, `0.7.0`, etc.',
      'Root cause of the Alpha-4 → Alpha-5 “You’re up to date” lie identified and documented in electron/main.cjs: electron-updater’s GitHubProvider runs `currentChannel = semver.prerelease(version)?.[0]` — for `0.6.95-Alpha4` that returns `"Alpha4"` (case-sensitive!), which is NOT in the `["alpha","beta"]` whitelist. Fallback matcher requires exact-string channel equality, so `"Alpha5" === "Alpha4"` is false. Loop picks Alpha 4 as its own latest — silent self-match.',
      'Real download progress replaces the synthetic 1.8s ramp. The progress bar shown during the download phase now reflects actual electron-updater download-progress events: real percent, real bytes transferred, real bytes per second.',
      'New progress label under the download bar: shows `transferred / total` (formatted as B/KB/MB) on the left and instantaneous speed (KB/s or MB/s) on the right. Disappears between downloads.',
      'Diagnostic copy block grows two new lines: `Download speed: <KB/s>` and `Download size: <transferred> / <total>`. Live during the download phase, `(idle)` otherwise.',
      'Scanning overlay (the synthetic “Fetching latest release from GitHub…” bar) now yields the moment a real download-progress event lands. Pre-fix, the synthetic ramp would mask the real percent for up to 1.8s after the actual download had started. Now the handoff is instant — you see real bytes the moment they start flowing.',
      'Migration note for users on Alpha4/Alpha5: this is a one-time manual install. Capital-A tags can’t find the new lowercase-dot tag automatically (different channel). From alpha.6 forward, the updater actually works.',
    ],
  },
  {
    version: '0.6.95-Alpha5',
    date: '2026-05-14',
    tagline: 'Formatting bar parity. Quillscript mode’s redux bar was still mounted at the bottom of the editor while Quillginate’s sat at the top — same buttons, opposite gravity. Now both modes share the same top slot, so muscle memory survives the toggle.',
    changes: [
      'Quillscript formatting redux bar moved from the bottom of the editor to the top, matching Quillginate exactly. CanvasEditor now mounts the bar above the QuillscriptEditor render block instead of below it.',
      'BottomReduxBar border-t → border-b so the visual boundary sits between the bar and the editor surface below (not the title chrome above).',
      'Popover menus (font size, line spacing) drop downward from the bar by default now — `openUpward` prop removed from the TriggerWithMenu wrapper, since the bar is no longer bottom-anchored.',
      '¶ (Paragraph dialog) + View menu restored to the right edge of the Quillscript formatting bar with `ml-auto`. They were stripped in Alpha 4 because the View popover got clipped against the editor surface when the bar was at the bottom; with the bar at the top, the popover has full downward room — identical layout to Quillginate.',
      'File name (`BottomReduxBar.jsx`) kept for this patch to avoid an import sweep — conceptually it’s now a top bar; rename deferred to a later cleanup.',
    ],
  },
  {
    version: '0.6.95-Alpha4',
    date: '2026-05-14',
    tagline: 'Auto-updater actually works now. The version suffix (-AlphaN) was being silently rejected as a prerelease and the updater was quietly bailing every time — fixed by allowing prereleases unconditionally so every tag, no matter the suffix, is a valid upgrade target. Plus the ¶ (Paragraph) + View buttons land on the right edge of the formatting toolbar (which itself moves to the top of the editor), giving the View popover full room to open downward, and the Update tab grows an event-log diagnostic panel so the next time anything goes wrong we can see why.',
    changes: [
      'Auto-updater now detects, downloads, and installs Alpha / Beta releases instead of silently doing nothing. Root cause was `allowPrerelease = false` in electron/main.cjs combined with version tags like `0.6.95-Alpha4` — semver treats the `-AlphaN` suffix as a prerelease, so the updater was filtering out literally every release we have ever published. Now allowPrerelease is true unconditionally; the channel is "every tag, regardless of suffix."',
      'Auto-download wired in. Click Check for Updates and electron-updater starts the download the instant the manifest comes back — you no longer have to click a second button to begin fetching. Matches MultiRP\'s UX exactly.',
      'Update tab status badge mirrors MultiRP: UPDATE AVAILABLE — vX.X.X (green) while we know there\'s an update, DOWNLOADING… X% (chalk yellow) while the bytes come down, UPDATE READY — vX.X.X (amber) once the installer is on disk and waiting.',
      '"Download New Update" renamed to Restart & Install when the installer is ready. Click it once — quitAndInstall fires, the app vanishes, the installer runs in place, the new version launches itself. No external NSIS wizard popup; nothing outside the app to chase.',
      'New event-log diagnostic panel under Settings › Update › Diagnostic. Rolling buffer of the last 20 electron-updater events with timestamps, color-coded by kind (info / warn / error / named-event). Surfaces silent failures in-app instead of forcing you to read stderr or guess. Copy diagnostic now includes the full event log too.',
      '¶ (Paragraph dialog) and View menu buttons relocated to the right edge of the formatting toolbar with `ml-auto` so they sit as their own group, separate from the formatting cluster. The formatting bar itself moved to the top of the editor in this release, so the View popover now opens downward with full room — no more clipping against the page surface. The Quillscript bottom redux bar stops hosting these buttons; it keeps only the line/word counters and zoom.',
    ],
  },
  {
    version: '0.6.95-Alpha3',
    date: '2026-05-13',
    tagline: 'Final v0.6 — the two carryovers from Alpha 2 land, plus polish across the cycle. Quillginate now has a writer-controlled hard page break (Mod-Enter) and a one-click spread toggle right in its header, and switching Quillginate on from a fresh canvas drops you straight into paginated layout instead of continuous-single.',
    changes: [
      'Hard page break (Mod-Enter / Ctrl+Enter). Inserts a dashed chalkboard PAGE BREAK marker exactly where you commit it. The paginator\'s overflow controller treats the marker as a forced break: blocks before stay on the current page, blocks after lead the next. Auto-overflow still runs as before — hard breaks layer on top, never fight with it. The marker is visible in Quillscript too, so you can see your committed breaks even when paginated layout is off.',
      'Spread-mode toggle in the Quillginate header. One click flips between single-page paginated and side-by-side book spread. When switching back from spread we land on vertical+multiple (the paginated tower), never vertical+one (that\'s Quillscript\'s lane). The toggle only renders while Quillginate is on — in Quillscript the toolbar stays minimal.',
      'Quillginate first-activation now promotes default vertical+one canvases to vertical+multiple, so flipping the toggle from a fresh canvas drops you into the paginator instead of accidentally landing in the continuous-single layout that belongs to Quillscript.',
      'Paginator never pulls blocks across a hard page break during the underflow pass. If you\'ve committed a break, it stays committed even when there\'s room on the previous page — your layout intent wins over auto-fit.',
      'Paginator never migrates a hard-break marker during the overflow pass. If a page overflows and ends in a hard break, the block BEFORE the marker is pulled instead, keeping the marker pinned as the page terminator.',
      'Forced-break detection runs on any pages-array change, not just on height changes. Pre-fix, a Mod-Enter that didn\'t reflow the page could leave the marker stranded mid-page because the rebalance loop was only scheduled by the height-delta measurement. Now any edit reschedules the rebalance, so the forced-break pass always fires.',
      'HardPageBreak parseHTML priority bumped above StarterKit\'s HorizontalRule. Pre-fix, `chain().insertContent({type: "hardPageBreak"})` round-tripped through HTML and the generic `tag: "hr"` rule from HorizontalRule won the parse, rebirthing the node as a plain HR — which the paginator\'s regex would then miss. Priority 100 vs 50 keeps our node intact.',
      'HardPageBreak owns its DOM through a tiny NodeView with explicit selectNode/deselectNode handlers. ProseMirror\'s default atom-selection path overwrites className wholesale, which was wiping our `hard-page-break` class the moment the marker was selected. Toggling the selectednode class via classList preserves both classes side-by-side.',
      'View menu popover flips upward when the View button sits near the viewport bottom. The button lives in the editor\'s bottom status bar; opening straight down was pushing the Page Movement / Show / Zoom panel partway off-screen and getting clipped by the strip above it.',
      'Alaria-internal: Alpha 3 is the final v0.6 release. v0.7.0 opens next — spread animation lives there. v1.0.0 is when QoL features like Find & Replace land, not earlier.',
    ],
  },
  {
    version: '0.6.65-Alpha2',
    date: '2026-05-12',
    tagline: 'Quillginate finally lives and dies on demand, and the canvas store gets a heartbeat so every hub that shows your work refreshes itself the instant you save. Quillscript sidebar grows the QoL you would expect from Notion: drag to reorder, double-click to rename, pick an emoji, pick a cover.',
    changes: [
      'Quillginate is now a real lifecycle, not just a CSS swap. Off means the paginator is not mounted at all — zero overflow controllers, zero per-page editors, zero compute. Flip it on and the current Quillscript HTML is split into pages via the paginator measure pass. Flip it off and the pages are joined back into a single doc so editing in Quillscript picks up exactly where you left layout-review.',
      'Tri-hub sync ring: a tiny event bus emits canvas:change whenever you save, pin, favorite, rename, change emoji, change cover, or delete. Quillibrary (canvas list), Quillounge (Pinned and Recents widget), the Quillscript sidebar, and the in-Quillginate Recents picker all subscribe and refresh debounced — no more stale lists waiting for a route change. Storage events propagate the same beat across tabs.',
      'Quillscript sidebar gets drag-reorder powered by @hello-pangea/dnd. Drag inside Pinned, inside any Space group, or inside Unsorted to set sort order; the new sort_order field persists per canvas and Quillibrary respects it everywhere.',
      'Inline rename in the sidebar: double-click any canvas entry and the title becomes an editable input on the spot. Enter commits, Esc cancels, blur commits. Same shortcut works on the canvas header title in the editor.',
      'New emoji picker on the canvas header. Click the page emoji and a chalk-styled popover opens with six tabs (Pages, Writing, Fantasy, Nature, Faces, Symbols), Reset clears back to the default 📄. The pick is saved to the canvas and broadcast through the sync ring so every list refreshes immediately.',
      'New cover picker. Hover the canvas header in Quillscript and an Add cover button appears; pick from twelve curated chalkboard swatches (deep emerald, chalk dusk, parchment, inkwell, crimson, sunmark, midnight, forest, amethyst, sea mist, rosewood, slate). Pure CSS gradients tuned to the dark green chalkboard palette — no external imagery, no AI art, nothing to download.',
      'New Recents picker dropdown in the Quillginate header. While paginated layout is on, the sidebar collapses out of the way, so a compact recents menu sits next to the Quillginate toggle for one-click hop between recent canvases. Stays live via the sync ring.',
      'Hard page break and spread-mode toggle inside Quillginate are queued for Alpha 3 — Alpha 3 is bugfix-only and final for v0.6, so these slot in there.',
    ],
  },
  {
    version: '0.6.35-Alpha1',
    date: '2026-05-12',
    tagline: 'Quillscript hub lands. Single-editor architecture kills the cross-page select-all bug at the root, the toolbar moves to a sticky bottom redux bar, a Notion-style left sidebar tree organizes canvases by Space, and a per-canvas Quillginate toggle parks the v0.5.82 paginator behind an opt-in switch.',
    changes: [
      'Quillscript is now the default writing mode. One Tiptap editor instance per canvas — not one per page. Cmd/Ctrl+A and drag-select cross any boundary the way Word and Notion do, because the boundaries are pure CSS now, not separate editors.',
      'Notion-style page header at the top of every canvas: a large emoji, a serif title input (Oldenburg, locked-in display face), and the body underneath. Enter from the title hops focus to the body the way Notion does.',
      'Sticky bottom redux bar hosts every formatting control that used to sit at the top in v0.5.82: font size, B/I/U/S, alignment, indent in/out, line spacing, lists, blockquote, code block, link, divider, ¶ Paragraph dialog, and View menu. Same commands, same shortcuts, just always-visible at the foot of the editor.',
      'New left sidebar: Pinned section, per-Space groups, Unsorted, with collapsible sections persisted in localStorage. The sidebar reflects the Canvas store directly so it stays in sync with Quillibrary regardless of Quillginate state. Drag-reorder and inline rename are queued for Alpha 2.',
      'New Quillginate toggle (the parchment-scroll icon next to Save in the canvas header). Per-canvas, persisted. Off by default — no paginator, no overflow controller, no per-page editors. Flip it on and the v0.5.82 paginated layout takes over verbatim (chalkboard pages, ruler, outline rail, top toolbar) so layout-review still works pixel-identically to before.',
      'Top bar gains a breadcrumb. When a canvas is open, the middle of the bar shows “Space › Title” instead of the spaces strip. The spaces strip still renders everywhere else. Canvas rail button renamed to Quillscript and reskinned to a pencil glyph.',
      'Silent migration shim merges legacy pages[] into a single doc:html blob when a v0.5.x canvas opens in Quillscript for the first time. The legacy stores are left untouched so flipping Quillginate back on still picks up the original paginated layout where applicable.',
      'Alaria-internal: this is the first of four alphas in the v0.6 cycle. Alpha 2 (~v0.6.65) wires up Quillginate proper — lifecycle teardown when off, tri-hub sync ring when on, page frames + ruler + spread mode + hard page breaks. Alpha 3 (~v0.6.95) is bugfix-only and becomes the v0.6 final.',
    ],
  },
  {
    version: '0.6.10-base0',
    date: '2026-05-12',
    tagline: 'Title commit — opens the v0.6 rewrite cycle. Functionally identical to v0.5.82.',
    changes: [
      'Version flag for the start of the v0.6 cycle. No behavior change — every byte of code from v0.5.82 still ships untouched. The bump exists so the v0.6 alphas have a clean ancestor on main.',
    ],
  },
  {
    version: '0.5.8',
    date: '2026-05-07',
    tagline: 'A real Word-style Paragraph dialog lives next to the View button now \u2014 indents, spacing, line spacing, page-break-before, hyphenation, and a full multilingual Asian Typography tab that adapts to whichever CJK or other Asian script you\u2019re actually writing in.',
    changes: [
      'New \u00b6 Paragraph button on the Canvas toolbar, parked right next to View. Opens a Word-faithful three-tab modal: Indents and Spacing, Line and Page Breaks, Asian Typography. The visual layout, tab order, and field labels mirror Word\u2019s Format \u2192 Paragraph dialog so muscle memory transfers cleanly. Apply scope is the current selection if you have one, otherwise the paragraph(s) the cursor is sitting in \u2014 same semantic Word uses.',
      'Tab 1: Indents and Spacing. Alignment (Left / Centered / Right / Justified), Left and Right indents in inches with 0.01\u2033 steppers, Special indent (none / First line / Hanging) with a By-value field, Spacing Before and After in points, Line spacing (Single / 1.5 / Double / At least / Exactly / Multiple) with the corresponding At-value field that enables only when the chosen mode needs it, plus the \u201cDon\u2019t add space between paragraphs of the same style\u201d toggle. Outline level, Mirror indents, Auto-adjust right indent, Collapsed by default, and Snap to grid render in the layout but stay disabled \u2014 they need plumbing that arrives with full flow-pagination in v0.6.0.',
      'Tab 2: Line and Page Breaks. Page break before and Don\u2019t hyphenate are wired up live; Widow/Orphan, Keep with next, Keep lines together, Suppress line numbers, and Tight wrap stay disabled with a tooltip pointing at v0.6.0 (they all depend on cross-page flow tracking that hasn\u2019t been written yet).',
      'Tab 3: Asian Typography \u2014 multilingual, not Japanese-only. The toggles map to native browser CSS properties (line-break: strict for kinsoku, word-break: break-all for Latin mid-word wrap, hanging-punctuation for burasagari, text-spacing-trim for start-of-line punctuation compression, text-autospace for ideograph-alpha and ideograph-numeric spacing). The browser applies the right rules for whatever script the text is written in \u2014 Chinese, Japanese, Korean, and other Asian scripts all benefit from the same toggles instead of being shoehorned into Japanese-specific behavior.',
      'Live preview pane at the bottom of the dialog reflects every change as you make it \u2014 alignment, indents, special indent, before/after spacing, line spacing, hyphenation, and the Latin wrap toggle all show in a real font sample with CJK characters mixed in so you can see autospace and kinsoku behavior before clicking OK.',
      'New ParagraphFormat Tiptap extension stores all the dialog\u2019s state as paragraph attributes (data-* attrs + inline style) so values round-trip through save / load / export cleanly. Lives next to the existing Indent and LineHeight extensions, doesn\u2019t collide with them \u2014 the Tab+Shift-Tab indent ladder and the toolbar line-spacing dropdown still work exactly as before.',
      'Footer matches Word: Tabs\u2026 and Set As Default sit on the left as disabled placeholders (Tabs\u2026 is a v0.6.0 sub-dialog, Set As Default lands in v0.5.9+ once style storage is in), Cancel and OK on the right. Animation polish, drag-resize, and the rest of the dialog\u2019s motion details are parked for v0.5.9 \u2192 v0.5.99.',
    ],
  },
  {
    version: '0.5.72',
    date: '2026-05-07',
    tagline: 'The update flow stops fighting itself. One toggle, one button, one mobile-style green badge on the Settings gear that tells you exactly how many releases you\u2019ve missed.',
    changes: [
      'Mobile-style update badge on the Settings gear. When a release newer than the one you have lands, the gear shows a small green pill with the number of releases between yours and latest \u2014 the same way iOS and Android show app-icon notification counts. One release behind shows \u201c1\u201d, three behind shows \u201c3\u201d, way-too-many behind shows \u201c99+\u201d. Tooltip on the gear says how many are pending. The badge replaces the previous undifferentiated green dot.',
      'Auto-download & install toggle removed. The two-toggle setup let the main process and the renderer race for who fired the download first \u2014 with the wrong combination, the manual \u201cDownload New Update\u201d button felt inert because the main process had already silently grabbed it. Updates are now strictly user-driven: the launch check is silent and just populates the badge; clicking Check for Updates runs the scan animation, auto-downloads in the background if a newer release is found, and waits for you to click Install & Restart. Nothing installs without your okay.',
      'Check for Updates is now a single pipeline. Scan animation \u2192 (if newer found) installer downloads to disk \u2192 \u201cInstall & Restart\u201d action button lights up. No more clicking Check, then waiting, then clicking Download separately, then waiting again, then clicking Install. One button starts the chain; the only second click you make is the explicit install confirmation.',
      'Diagnostic panel cleaned up. Removed the Auto-install line since the toggle no longer exists. The Last error / Updater mod / Dev mode lines all stay so support tickets still have everything they need.',
    ],
  },
  {
    version: '0.5.71',
    date: '2026-05-07',
    tagline: 'Spread and Single now show the same document, and the Side-by-Side spread slides between pages like Word — including auto-following the cursor onto the next page when you fill the current one.',
    changes: [
      'Format preserved across mode switches. Switching between Single View and Side-by-Side used to silently drift the document because the two modes wrote into separate stores (`content` vs `pages[]`). Both stores are now mirrored on every keystroke, so the doc you see in Spread is the exact same doc you see in Single — same paragraphs, same indents, same everything. Whichever mode you were just typing in is the canonical source.',
      'Side-by-Side now slides between spreads like Word. Replaced the old swap-positioning hack (which jammed the off-screen pages at left:-99999) with a single horizontal strip that translates with a 320ms cubic-bezier(0.22, 0.61, 0.36, 1) ease — the same pacing Word uses for its page transitions. Off-screen spreads stay mounted so the overflow controller can keep measuring and migrating in the background.',
      'Caret follows you onto the next page. When you type past the bottom of the current page and overflow spawns a new page, the cursor now jumps to that new page at its start — and the spread auto-advances to show it. No more typing into the void on page 1 while the new page sits invisible on the right side of spread 2. Same logic when you click into a different page: the spread containing that page slides into view automatically.',
    ],
  },
  {
    version: '0.5.7',
    date: '2026-05-07',
    tagline: 'Pagination that actually paginates. Pages spawn automatically when you fill one, blocks reflow back when you delete — no more “+ Add page”, no more text clipping into the void.',
    changes: [
      'Overflow-driven pagination. Type past the bottom of a page and the next paragraph migrates onto a fresh page automatically. Delete a page\'s worth of text and content reflows back from the following page to fill the room. Each page is still its own Tiptap editor under the hood — the new piece is a controller that watches every page\'s height and rebalances at top-level block boundaries (paragraphs, headings, lists, blockquotes, etc.).',
      'No more “+ Add page”. The dashed Add-page tile is gone from Side-by-Side, and the trailing phantom spread that existed only to host that tile is gone too. Pages spawn implicitly when content overflows.',
      'Side-by-Side always fits the viewport. The spread auto-scales so both facing pages fit on screen at any window size — no more vertical scroll inside a spread. Wheel and arrow keys page between spreads, just like before.',
      'Single View now paginates too. View → Multiple Pages with Vertical movement is the new paginated single-page experience: stacked page frames with overflow rebalancing between them. View → One Page still gives you the v0.5.0 continuous-scroll layout if that\'s what you prefer.',
      'Corner brackets inverted to match Word\'s print-layout cropmarks. The L-shaped marks now sit AT the writable-area corners with arms extending outward into the margin, not inward into the writable area. (Per the OTHER_SS screenshot you flagged.)',
      'Text now starts at the top-left writable corner, Word-style. The page wrapper was double-applying the margin padding (once on the page-frame, again on the editor wrapper), pushing text ~96px below the top brackets and giving short paragraphs a centered look. Removed the duplicate padding so text snaps to the writable-area top-left and fills downward like every other word processor.',
      'Paste keeps you on the same line. Default Tiptap pastes any HTML containing a block element (which is most clipboard payloads from browsers, docs, and email) as a brand-new paragraph, breaking your sentence onto a new line. Single-block paste content is now unwrapped and inserted inline at the cursor; multi-paragraph pastes still come in as proper paragraphs.',
      'Honest scope note: this is the first cut of overflow-driven pagination. Migration happens at top-level block boundaries, so a single paragraph that\'s longer than a page can still visibly overflow its frame until you break it (the controller can\'t safely split a paragraph mid-sentence yet). Caret may jump after a migration completes — if you typed at the end of page 1 and the paragraph migrated to page 2, the caret follows the content but you\'ll see a brief blink. These edges will get polished in 0.5.7.x patches as real-world docs surface them. The real flow-pagination rewrite (one editor across all pages) is parked for 0.6.0.',
    ],
  },
  {
    version: '0.5.3',
    date: '2026-05-06',
    tagline: 'The visible progress card now shows up for manual checks too — Check for Updates and Download New Update finally pop the same toast the auto path uses.',
    changes: [
      'v0.5.2 only surfaced the bottom-right progress card when auto-install was on. Manual flows still buried the action on the Update tab — if you weren\'t looking, you were guessing. v0.5.3 closes that gap: clicking Check for Updates or Download New Update now arms the same card so you actually see what\'s happening.',
      'Manual mode adds a Download button on the available phase since the main process doesn\'t auto-fire the download in that mode. Click it and the card transitions to the real percent bar exactly like the auto path, then to Install Now when it\'s done.',
      'Card stays silent when auto-install is OFF and you haven\'t clicked anything. No drive-by pop-ups when the app detects a release on its own — you only see the card if you opted in by clicking, or if auto-install is on.',
      'Dismissing the card disarms manual mode (and pins per-version dismissal), so closing the toast doesn\'t make it bounce back on the next state tick. Click Check again to re-arm.',
    ],
  },
  {
    version: '0.5.2',
    date: '2026-05-06',
    tagline: 'Auto-install stops being a ghost. When a new release lands and you have auto-install on, you now actually see the download happening — progress card, percent bar, and an “Install now” button when it finishes.',
    changes: [
      'New bottom-right progress card surfaces the auto-install flow in real time. Previously the main process silently fired downloadUpdate() in the background and the only indicator was a status line on the Update tab in Settings — you\'d only spot it if you happened to be there. Now you get a non-blocking card that walks through detected → downloading → ready, with a real percent bar fed by the existing download-progress events.',
      '“Install now” button on the card once the download finishes — lets you land the update mid-session instead of waiting for next launch. “Later” just dismisses the card and the existing 10-second pending-install countdown still fires when you reopen the app, so nothing is lost either way.',
      'Per-version dismissal: closing the card for v0.5.3 won\'t pop it back open every time the state ticks. A new release with a different version will show the card again.',
      'Card stays out of the way — 360px wide, bottom-right, backdrop-blur, doesn\'t block typing. Manual checks (auto-install off) are unchanged: those flows still drive the Update tab in Settings.',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-05-06',
    tagline: 'v0.5.0 follow-ups — tabs switch again, the Hub stops gaslighting you about "no canvases yet", the ruler bar fits the page, and side-to-side mode actually fits on screen.',
    changes: [
      'Tab switching is unstuck. The route-sync effect was treating the URL as the unconditional source of truth, so clicking another tab snapped activeId back. Now activeId wins after first mount and the URL follows it.',
      'Canvas Hub recent grid: stopped hiding canvases that were already open in tabs. Freshly-created canvases (which always open in a tab) used to disappear from "Recent" entirely — now they stay visible with a tiny “Open” badge so you can see what\'s already loaded.',
      'Ruler bar finally measures itself correctly. The post-Tiptap measure pass ran once on mount before the editor had laid out, so contentWidth stayed at 0 forever and the ruler collapsed to a thin sliver. Now it re-measures whenever the active editor swaps and retries with rAF until the editor has real geometry. Resizes the window properly too.',
      'Side-to-side mode now respects the zoom slider. The spread used to render raw 1632×1056 px with no scaling, blowing past smaller viewports and stretching pages flush to the edges with no padding. Now it scales like vertical mode does, keeps a chalkboard gutter around the spread, and lets you scroll if you zoom in past the viewport.',
      'Default zoom for side-to-side dropped from 125% → 100%. The 125% pick was tuned for the old Quill spread; the Tiptap spread is rendered at honest US-Letter dimensions and already fills the chalkboard, so 125% was clipping the right page. You can still pick 125% (or any zoom) yourself — it\'s just no longer the auto-applied default when you swap modes.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-05-06',
    tagline: 'Quill is gone — Tiptap takes the canvas. Both pages in side-to-side are now typeable, and you can finally jump back to the Canvas Hub from inside an open canvas.',
    changes: [
      'Quill → Tiptap. The whole Canvas editor is now Tiptap-based. Existing canvases load and migrate their HTML on first open — bold/italic/headings/lists/alignment/indents/font size/line height all carry over.',
      'Side-to-Side: both pages are now typeable. Each page is its own independent Tiptap editor, and a dashed "Add page" tile sits at the next slot when you\'re ready for more. The earlier "page full" chip is retired — just keep writing on the next page.',
      'Vertical mode: visual page-frame overlays now grow with your content (instead of three fixed phantom pages). Single-page mode also stays clean and centered.',
      'New "Canvas Hub" home button sits before the tabs. One click drops you back to the landing screen — your open tabs stick around so you can hop back in anytime.',
      'Toolbar formats are unchanged: Bold/Italic/Underline/Strike, headings, lists, blockquote, code block, alignment, indent in/out, font size, line spacing, link, divider — all wired through to the new editor.',
      'Tab / Shift-Tab still inserts a literal tab and removes the preceding tab. Shipped as a proper Tiptap keymap extension this time, not a DOM-level capture-phase hack.',
      'Honest scope note: independent pages, not a real cross-page text-flow extension. Vertical mode is one continuous editor with visual page overlays; side-to-side has N independent editors. The earlier "phantom flow" / "page full" copy referencing a v0.5.0 flow extension is gone because that\'s not what shipped.',
    ],
  },
  {
    version: '0.4.55',
    date: '2026-05-06',
    tagline: 'Side-to-side now scrolls vertically when you zoom past fit, and pasting no longer flickers.',
    changes: [
      'Side-to-Side mode used to clip both top and bottom of the spread when zoom went above the auto-fit (which the new 125% default did by design). Now the viewport switches to vertical scroll above 100% so you can actually reach the bottom of a tall page.',
      'Pasting into the Canvas no longer briefly shows the pasted text on the next line before snapping back. Disabled Quill\'s post-paste visual-match pass that was causing the ghost render.',
    ],
  },
  {
    version: '0.4.52',
    date: '2026-05-06',
    tagline: 'Canvas bug squash \u2014 dropdowns now sit on top, multi-page view centers properly, side-to-side defaults to a comfier 125% zoom, and full pages stop expanding.',
    changes: [
      'Font Size and Line Spacing dropdowns now portal to the document body instead of fighting the page surface for z-index. They appear in front of the editor where they belong.',
      'Multi-page (Vertical \u00b7 Multiple) layout now centers pages horizontally at every zoom level. The 100/zoom% width hack was pinning stacks to the right edge below 100% zoom.',
      'Side-to-Side mode now defaults to 125% zoom when you switch into it, and snaps back to 100% on the way to Vertical. You can still tweak it from the View menu.',
      'Side-to-Side: when a page is full of text, the live page now clips at the page bottom with a soft fade and a tiny "page full" chip instead of scrolling internally. True cross-page text flow is still on the v0.5.0 (Tiptap) ticket \u2014 this is the honest stopgap.',
    ],
  },
  {
    version: '0.4.51',
    date: '2026-05-06',
    tagline: 'Auto-install is now visible \u2014 a 10s countdown on next launch with a chalkboard splash on the way back. Manual checks now show a scan animation.',
    changes: [
      'When Auto-download & Install is on and a new version was downloaded in the background, the next launch now shows a centered countdown modal that ticks down from 10s before installing. No more silent install-on-quit confusion.',
      'New chalkboard splash on every launch \u2014 Quillosofi wordmark in Oldenburg with a soft fade-in and a tiny spinner. About 1.6s. Just a nicer way to land in the app.',
      'When Auto-install is OFF, clicking Check for Updates now plays a ~2s scan progress bar before resolving. The button no longer feels inert while the check runs.',
      'Pending-install marker is persisted to userData (pending-install.json) so the countdown survives a crash or force-quit between download and the next launch.',
    ],
  },
  {
    version: '0.4.50',
    date: '2026-05-06',
    tagline: 'Pinned/Favorites view is now a proper card grid — Spaces look like canvases & sheets, and Canvases finally show up in the Canvases section.',
    changes: [
      'Pinned spaces now render as cards in a grid, matching the canvas and spreadsheet cards. No more wide thin row stuck in the middle of the page.',
      'The Canvases section in the Pinned/Favorites view now actually shows your pinned and favorite canvases — the search bar / sort / view-switcher toolbar that was hijacking the section is hidden in this view.',
      'Hover a space card to favorite/unpin/pin it inline (mirrors the hover actions on canvas and sheet cards).',
    ],
  },
  {
    version: '0.4.49',
    date: '2026-05-06',
    tagline: 'Spaces settings simplified — Instructions/Sources/Files/Memory tabs removed (they were AI leftovers). Pinned view now shows Canvases first, then Spaces, then Spreadsheets.',
    changes: [
      'New Space and Edit Space dialogs are now a single clean form — name, description, emoji. Done.',
      'Removed the Instructions, Sources, Files, and Memory tabs from the Space settings dialog. Those were AI-era features and have no place in pure-writing Quillosofi.',
      'Existing spaces keep their old AI-era data on disk untouched (system_prompt, links, files, memory) — the dialog just doesn\u2019t expose it anymore.',
      'Pinned and Favorites view in Quillibrary now lists Canvases first, then Spaces, then Spreadsheets. (Was Spaces \u2192 Canvases \u2192 Spreadsheets before.)',
    ],
  },
  {
    version: '0.4.48',
    date: '2026-05-06',
    tagline: 'Spaces moved into Quillibrary. The rail Spaces button is gone, and Spaces can now be pinned and favorited just like canvases.',
    changes: [
      'Spaces are now a Quillibrary feature, not a top-level rail tab. Open Quillibrary, find Spaces in the left sidebar.',
      'New + button next to the SPACES header in Quillibrary opens the New Space dialog.',
      'Spaces can be pinned and favorited — right-click any space in the sidebar (or hover the row in Pinned/Favorites view) to toggle.',
      'Pinned spaces float to the top of the SPACES section in the Quillibrary sidebar.',
      'The Pinned and Favorites filters now show matching Spaces alongside canvases and sheets.',
      'Removed the Grid icon Spaces button from the SpaceRail. Old /spaces URLs redirect to /quillibrary, so nothing breaks.',
      'Removed the orphaned SpacesGrid component now that the dedicated /spaces page is gone.',
    ],
  },
  {
    version: '0.4.47',
    date: '2026-05-06',
    tagline: 'Hotfix — v0.4.46 shipped with a missing Menu icon import that crashed the whole render. Sorry. Fixed.',
    changes: [
      'Re-imported the Menu icon in Layout.jsx. v0.4.46 had it accidentally removed during the AI rip cleanup, which threw `ReferenceError: Menu is not defined` on first render — leaving the window as a blank chalkboard with no UI on top.',
      'No other behavior changes. If v0.4.46 worked for you somehow, v0.4.47 is functionally identical.',
    ],
  },
  {
    version: '0.4.46',
    date: '2026-05-06',
    tagline: 'The Pure Writing Refactor — the entire AI/chat layer is gone, Spaces revamped as pure writing organisation.',
    changes: [
      'Surgically removed the entire AI/chat layer. No more Chat page, Research page, Settings page (the orphaned one), AI Settings modal, Bot Persona, API Key tab, system prompts as prompts, command picker, message canvases, or LLM caller. Quillosofi is now a pure writing app.',
      'Spaces revamped end-to-end. The Space view no longer lists conversations — it shows the canvases inside that space, plus your reference links, attached files, and “Notes” (formerly the system_prompt field, repurposed as plain notes).',
      'New “New canvas in this space” button replaces the old “New chat in this space” button. Spaces are now writing organisation tools, not chat folders.',
      'Custom Dictionary stayed — but the “AI context pin” is now just a plain Star. Pinned words are renamed to Starred. Same data field under the hood, no more AI-context-injection language anywhere in the UI.',
      'Right-click context menu in canvases lost the “Add + Pin to AI context” entry. Plain “Add to Dictionary” remains.',
      'Stats panel rebuilt around writing: canvas count, sheet count, and a recent canvases list. The conversations stat, recent chats list, and AI quick-toggle row are gone.',
      'Sources Vault stays as a manual-entry tool — no auto-cite, no AI-generated citations, just a place to track sources you add yourself.',
      'Import/Export rewritten to handle writing artifacts only: canvases, spreadsheets, project spaces, attached files, and your custom dictionary. Old chat-era exports won’t round-trip; new format is version 2.0.',
      'Removed orphaned Stripe dependencies (@stripe/react-stripe-js, @stripe/stripe-js) that had been hanging around since v0.4.45 when the Upgrade tab became the Donate tab.',
      'About sections in Settings and the Quillosofi Centre rewritten around what’s actually here: Canvas, Page Setup, Spreadsheets, Project Spaces, Custom Dictionary, Custom Fonts, Theme Customization, and Privacy First.',
    ],
  },
  {
    version: '0.4.45',
    date: '2026-05-04',
    tagline: 'Settings → Upgrade is now Settings → Donate. Real Ko-Fi link, no fake pricing tiers.',
    changes: [
      'Replaced the placeholder “Free / Pro / Ultra” Upgrade tab with a proper Donate tab. Quillosofi is free and stays free — no paywalls, no subscriptions.',
      'New Donate tab explains exactly where support goes: keeping quillosofi.com on Spaceship (domain + hosting renewal) and buying time to ship features. No vague “support this app” nonsense.',
      'Direct Ko-Fi button (ko-fi.com/alarkiusej) opens via shell.openExternal so the desktop window doesn’t navigate away.',
      'Tab icon swapped from ⚡ lightning to 🤍 heart, label is now just “Donate”.',
    ],
  },
  {
    version: '0.4.44',
    date: '2026-05-04',
    tagline: 'Friendlier update-check error — the wall of red electron-updater stack traces is gone.',
    changes: [
      'The “Update check failed” red panel is now a soft amber notice with a Rick Astley-flavoured nudge to try again in ~10 minutes (the most common cause is CI still building a freshly-pushed release).',
      'When the underlying error looks like a fresh-tag 404 on latest.yml, the notice adds a one-line explanation. Otherwise it just says try again later.',
      'Full raw error payload still lives in the Diagnostic panel below — nothing was thrown away, just hidden behind a click for support-ticket use.',
    ],
  },
  {
    version: '0.4.43',
    date: '2026-05-04',
    tagline: 'Tiny polish — dropped the “Start writing…” placeholder on Canvas. Blank pages stay blank.',
    changes: [
      'Removed the “Start writing…” ghost text from empty Canvas editors. The blank-state pseudo-element is gone, so a fresh page is just a clean page.',
    ],
  },
  {
    version: '0.4.42',
    date: '2026-05-04',
    tagline: 'No more stealth updates — post-update toast surfaces version jumps, plus a heads-up chip on the auto-install toggle.',
    changes: [
      'New post-update toast (bottom-right): on first launch after an auto-install, Quillosofi tells you which version you came from and which one you’re on, with a “See what’s new” link straight to the Update tab.',
      'Settings → Update → Auto-download & install now shows a small amber heads-up chip when enabled, so you know future updates will apply silently on next launch.',
      'The toast and the existing green dot on the Settings gear share the same one-shot signal — dismissing either clears both.',
    ],
  },
  {
    version: '0.4.40',
    date: '2026-05-04',
    tagline: 'Side-to-Side polish — pages fit the viewport, mouse wheel flips spreads, and Letter trims breathe.',
    changes: [
      'Side to Side now auto-fits the spread to the viewport height (Word-style) so vertical scrolling is gone — no more pages running off the bottom.',
      'Mouse wheel over the chalkboard or phantom pages now flips spreads horizontally, just like Word’s Side to Side mode. (Wheel inside the live editor still scrolls text normally.)',
      'Letter, Legal, and other large trims now have proper chalkboard breathing room on the left and right edges in Vertical view — page edges no longer kiss the sidebar.',
      'Live page in Side to Side is height-capped to one paper sheet; the editor scrolls internally instead of stretching the page off-screen.',
    ],
  },
  {
    version: '0.4.38',
    date: '2026-05-04',
    tagline: 'Visual page-frame pagination + Page Setup — Canvas finally looks like a real page (or a real book spread).',
    changes: [
      'New View button in the Canvas toolbar (top-right) — popover with Page Movement (Vertical / Side to Side), Show (One Page / Multiple Pages), Zoom (50–200%), and Page Setup….',
      'Vertical / One Page: the editor now sits on a real white paper sheet with corner-bracket margin guides and a page-number badge.',
      'Vertical / Multiple Pages: phantom pages stack below page 1 (visual only — real text flow lands in v0.4.50 with the Tiptap migration).',
      'Side to Side: book-spread layout with a verso phantom page on the left and the live recto on the right. Spine seam, nav arrows, and a spread indicator at the bottom.',
      'New Page Setup dialog (Word-style) — Margins tab (top/bottom/left/right/gutter, Portrait/Landscape, Mirror Margins for binding), Paper tab (Letter, Legal, A4, A5, B5, Tabloid, Executive, KDP trim sizes 5×8 / 5.25×8 / 5.5×8.5 / 6×9 / 6.14×9.21 / 7×10, plus Custom). Mini live preview, Reset to defaults, Set As Default.',
      'Per-canvas page setup persists to localStorage; Set As Default seeds new canvases with your preferred trim + margins.',
      'Ruler now snaps to the active page width and respects the chosen left/right margins (and inside/outside flips when Mirror Margins is on for verso pages).',
    ],
  },
  {
    version: '0.4.37',
    date: '2026-05-04',
    tagline: 'Auto-update fix — the Windows installer no longer chokes on \'Failed to uninstall old application files\'.',
    changes: [
      'Bumped electron-builder 24.13.3 → 26.0.20 to pick up the fix for the regression in 24.13.2 that mis-detected the app as running and aborted the uninstall step with error code 2.',
      'Disabled differentialPackage — the patch-based update path was contributing to the same uninstaller failure. Each update is now a clean full install.',
      'Added a postinstall step that appends `CRCCheck off` to electron-builder\'s NSIS template, defusing the integrity check that fired the error in the first place.',
      'CI Node version bumped 20 → 22 (required by the new electron-builder).',
    ],
  },
  {
    version: '0.4.36',
    date: '2026-05-04',
    tagline: 'Tab-close fix — the X button on editor tabs actually closes them now.',
    changes: [
      'Fixed: clicking the X on an inactive tab did nothing, and closing the only/active tab popped it right back open. Both were aftershocks of the v0.4.35 route-precedence sync — the URL still pointed at the closed tab so the effect reopened it. Hub now hops the URL to a fallback tab (or the /canvas landing page when the last tab closes).',
      'Inactive-tab X is now always visible instead of fading in on hover — less guesswork, easier to aim at.',
      'Close button switched to onMouseDown so it can\'t lose a focus race with the row\'s click-to-activate handler.',
      'Same fixes applied to the Sheets editor hub.',
    ],
  },
  {
    version: '0.4.35',
    date: '2026-05-04',
    tagline: 'Bugfix — Canvas (and Sheets) editor no longer ping-pongs when swapping documents.',
    changes: [
      'Fixed an infinite render loop when opening a different canvas from Quillibrary while one was already open. The hub had two URL-sync effects that fought each other when the route id and the persisted lastOpen id disagreed — effect 1 set active=B, effect 2 immediately yanked the URL back to A, repeat forever. Merged them into a single effect with the route as the source of truth.',
      'Same fix applied preemptively to the Sheets editor hub (same pattern, same latent bug).',
    ],
  },
  {
    version: '0.4.34',
    date: '2026-05-03',
    tagline: 'Ruler polish — proper Word ⌐ Left Tab glyph, locked indent markers, new Right Indent triangle.',
    changes: [
      'Left Tab stop glyph now renders as a proper Word-style ⌐ shape — vertical bar on the left, foot extending right at the bottom (was mirrored before).',
      'Hourglass indent markers (▽ first-line, △ hanging, ▭ left) are now locked in place. Tab key no longer drags them around.',
      'Tab key now inserts a literal tab character (just like Word) instead of mutating the paragraph indent. CSS tab-size: 4 makes it render as visible spacing.',
      'New Right Indent marker (◁) at the right margin — draggable like the left side, snaps to 4px increments. Driven by a new padding-right block-level format.',
    ],
  },
  {
    version: '0.4.33',
    date: '2026-05-03',
    tagline: 'Alt-toggle native menu bar is now sticky — stays open until you press Alt again.',
    changes: [
      'The hidden File / Edit / View / Window / Help menu bar (yes, that one Alaria found by accident) is now a deliberate toggle instead of a flicker. Press Alt to reveal it, press Alt again to dismiss it. Clicking elsewhere no longer closes it.',
      'Implementation: intercepts bare Alt keydown via Electron\'s before-input-event in the main process and drives setMenuBarVisible() ourselves — bypassing Electron\'s default “auto-hide on blur” behavior.',
    ],
  },
  {
    version: '0.4.32',
    date: '2026-05-03',
    tagline: 'Three independent ruler markers — first-line, hanging, and left indent — just like Word. Tab no longer drags the whole stack.',
    changes: [
      'Ruler now has THREE separately-draggable markers: ▽ top wedge = first-line indent, △ middle wedge = hanging indent, ▭ bottom slab = left indent. Mirrors Microsoft Word\'s behavior exactly.',
      'Drag TOP → only the first line moves (sets text-indent in em). Drag MIDDLE → lines 2+ shift while the first-line marker holds its absolute position. Drag BOTTOM → entire paragraph slides; top + middle travel together.',
      'Bug fix: Tab key no longer drags the top marker around. Tab only updates the left indent now, so the first-line wedge stays put unless you drag it yourself.',
      'New Quill block format `text-indent` registered globally so first-line indents persist across save/load and export.',
      'Marker drag handlers snap text-indent to the nearest 0.25em for cleaner increments.',
    ],
  },
  {
    version: '0.4.31',
    date: '2026-05-03',
    tagline: 'Tab key REALLY indents now (DOM capture) + Word-style monochrome ruler with draggable tab stops.',
    changes: [
      'Tab / Shift-Tab indent finally works for real. Earlier attempts via Quill\'s keyboard module kept losing to built-in Tab handlers; switched to a DOM-level keydown listener on .ql-editor in the capture phase, which fires before Quill ever sees the keystroke. Cap 8 levels, lists + code-blocks excluded.',
      'Ruler restyled to match Word: monochrome light-gray inset strip, smaller graduated ticks (1/8” / 1/4” / 1/2” / 1”), white digit labels, dimmed margin shading. No more pink and yellow.',
      'Indent marker is now a Word-style hourglass (top wedge + bottom wedge) instead of a single triangle. Drag the bottom wedge to set the active paragraph\'s indent.',
      'Tab stops: click the bottom strip of the ruler to drop a stop, then DRAG it to wherever you want — just like Word. Right-click or double-click any stop to remove it.',
      'Click sensitivity fixed — stops only spawn in the bottom 60% of the ruler height, never within 8px of an existing marker, never on accidental tick-area clicks.',
      'Tab stop glyphs are the Word L-shape in white, with a dark hairline stroke for legibility on any background.',
    ],
  },
  {
    version: '0.4.30',
    date: '2026-05-03',
    tagline: 'Outline rail glow-up + Word-style ruler bar with draggable indent and tab stops.',
    changes: [
      'Outline navigator no longer floats over your text. Lives in a persistent 36px gutter on the left edge of the Canvas — hover-tooltip toggle, expands to the full panel when opened.',
      'When collapsed, the gutter shows a subtle vertical “N headings” label so you know how many anchors are waiting on the other side.',
      'NEW: Ruler bar above every Canvas editor. Word-style numbered scale with major + minor tick marks, dimmed margin shading, and live measurement that follows your editor width.',
      'Drag the ▲ marker on the ruler to set the active paragraph’s left indent — maps to the same 0.5in / 3em steps as the toolbar Indent buttons (cap 8 levels). The marker tracks selection in real time.',
      'Click empty ruler space to drop a tab-stop marker (Word-style L glyph). Click an existing stop to remove it. Stops persist per-canvas in local storage.',
      'Custom Quill tab-jumping to those stops lands with the v0.5 Tiptap rewrite — today the ruler delivers the visual layout metaphor + the indent control.',
    ],
  },
  {
    version: '0.4.29',
    date: '2026-05-03',
    tagline: 'Tab key actually indents now — v0.4.26 binding finally wins the keyboard race.',
    changes: [
      'Tab → indent / Shift-Tab → outdent on Canvas paragraphs now actually fires. Previous static binding was getting pre-empted by Quill\'s built-in Tab handler. Bindings now register imperatively after the editor mounts so they jump to the front of the keyboard chain.',
      'Lists keep their Tab nesting behavior — we only intercept Tab on plain paragraphs, so bulleted/numbered lists still indent like Word.',
      'Indent caps at 8 levels, outdent floors at 0, same as the toolbar buttons.',
    ],
  },
  {
    version: '0.4.28',
    date: '2026-05-03',
    tagline: 'Outline rail moved to the left side of Canvas — where navigation belongs.',
    changes: [
      'The collapsible Outline / header navigator now lives on the LEFT side of the Canvas, next to the editor — not the right. Reads like every IDE and word processor on earth.',
      'Toggle button (when collapsed) sits in the top-left corner of the writing area now. Hide chevron points left when the rail is open.',
    ],
  },
  {
    version: '0.4.27',
    date: '2026-05-03',
    tagline: 'Tiny green dot says hi after every fresh update.',
    changes: [
      'After the app restarts on a new version, a tiny green dot pops up on the Settings gear in the rail and on the Update tab inside Settings — so you actually notice you got a new build.',
      'Open the Update tab once and the dot dismisses itself. Won\'t come back until the next version bump.',
      'Quiet on first-ever install — only fires when there\'s a real version change to celebrate.',
    ],
  },
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

// v0.5.72 — count releases between `installedVersion` (exclusive) and
// `latestVersion` (inclusive). Drives the mobile-style green pill badge on
// the Settings gear so users see at a glance how many releases they've
// missed. Returns 0 if no update or no changelog entries match.
export function pendingReleaseCount(installedVersion, latestVersion) {
  if (!latestVersion) return 0;
  const installed = normalize(installedVersion);
  const latest = normalize(latestVersion);
  if (!latest) return 0;
  // If installed is unparseable, treat all entries up to latest as pending.
  return CHANGELOG.filter((e) => {
    const v = normalize(e.version);
    if (!v) return false;
    if (compareVersions(v, latest) > 0) return false; // newer than latest, ignore
    if (!installed) return true;
    return compareVersions(v, installed) > 0; // strictly newer than installed
  }).length;
}
