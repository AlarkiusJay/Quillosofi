<div align="center">

<img src="build/icon.svg" alt="Quillosofi" width="128" />

# Quillosofi

### Your Writing & Worldbuilding Companion — Canvas, Sheets, & a Quillibrary Actually Sticks.

`Native Desktop App` · `Privacy First` · `Chalkboard Aesthetic` · `Free & Open Source`

By **Alarkius Elvya Jay** · [quillosofi.com](https://www.quillosofi.com)

</div>

---

Quillosofi is an all-in-one writing & thinking studio for creators — draft, organise, format, research, and reference, all in one place. A **native desktop app** (Windows `.exe`, macOS `.dmg`, Linux `.AppImage` / `.deb`) built from this single repo, with a dark-green chalkboard surface, sticky-note widgets, and a real document editor that paginates like Word.

[**Download the latest release**](https://github.com/AlarkiusJay/Quillosofi/releases/latest)

> If Windows SmartScreen warns you, hit **More info → Run anyway** — Quillosofi is unsigned but open source. The whole codebase is right here.

---

## What Quillosofi Can Do

### Canvas — a real document editor
Write, format, and save rich-text canvases as full-fledged documents. Two modes, one document, one toggle between them.
- **Quillscript** (default) — single Tiptap editor for the whole canvas. Cmd/Ctrl+A and drag-select cross any boundary the way Word and Notion do. Notion-style page header with emoji, cover, and a serif Oldenburg title.
- **Quillginate** — flip the parchment-scroll toggle and the same document re-flows into paginated layout: chalkboard page frames, Word-style ruler, outline rail, top toolbar. Flip it off and the pages join back into a continuous doc with zero loss.
- **Overflow-driven pagination** in Quillginate — type past the bottom of a page and the next paragraph migrates to a fresh page automatically. Delete a page's worth of text and content reflows back to fill the room. Underflow detection measures the natural span between the first and last block, independent of editor min-height.
- **Hard page break** (Mod-Enter / Ctrl+Enter) — drops a dashed chalkboard PAGE BREAK marker exactly where you commit it. Auto-overflow respects it; the paginator never migrates blocks across a committed break.
- **Spread-mode toggle** in the Quillginate header — one click flips between single-page paginated and side-by-side book spread. Mouse-wheel flips spreads.
- **Visual page-frame pagination** — pick US Letter, A4, A5, KDP trim sizes (5×8, 5.25×8, 5.5×8.5, 6×9, 7×10, 8×10), or define a custom trim. Pages render as actual sheets behind the editor.
- **Page Setup dialog** — Margins, Paper, and Layout tabs. Mirrored margins, gutter, custom inches/cm.
- **View modes** — Vertical scroll, Side-to-Side spreads, One Page, or Multiple Pages.
- **Word-style top toolbar** — font size, alignment, line spacing, indent, outline, lists. Same slot in both modes — muscle memory survives the Quillscript ↔ Quillginate toggle.
- **Word-style ruler** (Quillginate) — three independent indent markers (first-line, hanging, left), draggable tab stops, real Left-Tab glyph, right-indent triangle.
- **¶ Paragraph dialog** — three-tab Word-faithful modal (Indents and Spacing, Line and Page Breaks, Asian Typography) with a live preview pane. The Asian Typography toggles map to native browser CSS so they adapt to whichever CJK or other Asian script you're writing in.
- **Tab key actually indents** — proper DOM capture, no keyboard race conditions.
- **Outline rail** on the left side of Canvas for jumping around long documents.
- **Multi-doc tabs** with a Canvas Editor Hub and Resume Last to pick up where you stopped.
- **Notion-style left sidebar** — Pinned section, per-Space groups, Unsorted. Drag to reorder, double-click to rename, pick an emoji from a six-tab chalk-styled picker, pick from twelve curated chalkboard cover swatches (no external imagery, pure CSS gradients).
- **Tri-hub sync ring** — Quillibrary, Quillounge, the sidebar, and the in-Quillginate Recents picker all refresh the instant you save, pin, favorite, rename, change emoji, change cover, or delete. Works across browser tabs too.
- **Export** to TXT, MD, DOCX, or PDF.

### Sheets — live spreadsheets in your workflow
- Build conditional formatting and typed cells.
- Same multi-doc tab + Resume Last UX as Canvas via the Sheets Editor Hub.
- Lives next to your other writing inside any Space.

### Custom Dictionary
- Build your own personal vocabulary: words, definitions, categories.
- **Pin** words to passively inject them into the writing context — perfect for character names, lore terms, made-up languages, or specialised vocabulary.

### Customisation
- **Themes** with full theme propagation across the app.
- **Fonts** — Oldenburg humanist slab serif by default, Lora as a backward-compatible fallback, plus everything else you'd expect.
- **Custom Keybinds** — every shortcut is editable in Settings → Keybinds.
- Sticky **Alt-toggle** native menu bar — press once, stays open until you press Alt again.

### Privacy First
- All your data is stored **locally** on your machine.
- Encrypted, never sold, always under your control.
- Export or delete everything at any time from Settings → Data & Security.

### Auto-Updates Done Right
- `electron-updater` checks GitHub Releases on every launch and downloads new versions in the background.
- **In-session install prompt** — when a download finishes while the app is open, a modal pops with a 5-second countdown, the release tagline, and three buttons: Install Now (fires immediately), Pause (holds the countdown so you can read the tagline), Later (defers to next launch). No more silently closing-and-reinstalling under you.
- **Next-launch fallback** — if you hit Later or quit before the countdown finishes, the pending install fires on your next launch via a 10-second countdown toast. Nothing is lost.
- **Post-update toast** on first launch after an install — tells you which version you came from and which you're on, with a "See what's new" jump straight to the Update tab.
- **Real download progress** — percent, transferred / total bytes, and live KB/s or MB/s speed from electron-updater's `download-progress` event. No synthetic ramp.
- **Update tab status badge** — UPDATE AVAILABLE (green), DOWNLOADING X% (chalk yellow), UPDATE READY (amber).
- **Settings gear badge** — mobile-style green pill on the Settings gear showing how many releases you're behind (1, 3, 99+).
- **Diagnostic panel** — rolling buffer of the last 20 electron-updater events with timestamps, color-coded by kind. Surfaces silent failures in-app so support tickets actually have data.
- Alpha and Beta channels supported via standard semver prerelease tags (`-alpha.N`, `-beta.N`).

### Donate, Not Upgrade
Quillosofi is **free and stays free** — no Pro tier, no subscriptions, no paywalls. Settings → Donate has a real Ko-Fi link that helps cover the [quillosofi.com](https://www.quillosofi.com) domain + Spaceship hosting renewal and buys time to keep shipping features.

---

## Desktop edition

The desktop app gives you everything the web version has, plus:

- **System tray** — runs quietly in the background, click to summon
- **Hide-to-tray** — close the window without quitting
- **Global hotkey** — `Ctrl/Cmd+Shift+Q` to bring Quillosofi forward
- **Single-instance lock** — one Quillosofi at a time, focuses the existing window
- **Branded native installer** with the mint feather icon
- **External links** open in your OS browser instead of hijacking the app window
- **Local-first storage** — your data lives on your PC, not in someone else's cloud

---

## Stack

- **Frontend:** React 18 + Vite + Tailwind + Radix UI
- **Editor:** Tiptap (single-editor architecture — one instance per canvas, cross-page selection works natively)
- **Drag & drop:** @hello-pangea/dnd for sidebar reorder
- **Desktop:** Electron + electron-builder + electron-updater
- **CI:** GitHub Actions — auto-builds Win/Mac/Linux installers on every `v*` tag

---

## Local development

```bash
# 1. Install
npm install

# 2. Set Base44 env (only needed for the running app, not the build)
# Create .env.local with:
#   VITE_BASE44_APP_ID=...
#   VITE_BASE44_APP_BASE_URL=...

# 3a. Run the web app
npm run dev                # http://localhost:5173

# 3b. Run the desktop app (Vite + Electron together)
npm run electron:dev
```

## Build a desktop installer

```bash
npm run build:win      # Quillosofi-Setup-<version>.exe   in release/
npm run build:mac      # Quillosofi-<version>.dmg
npm run build:linux    # Quillosofi-<version>.AppImage  +  .deb
npm run build:all      # all three (only really works on macOS runners)
```

Output lives in `release/`.

## Auto-release via GitHub Actions

Push a tag and CI builds installers on Windows, macOS, and Linux runners
in parallel and attaches them to a GitHub Release:

```bash
npm version patch       # bumps version + makes a v* tag
git push --follow-tags
```

---

## Repo layout

```
electron/                       Electron main + preload (CommonJS)
src/                            React app (renderer)
  ├─ pages/                     Chat, Settings, Space, CanvasVault,
  │                             CanvasEditorHub, SheetsEditorHub,
  │                             QuillosofiCentre
  ├─ components/                UI + chat/spaces/vault/settings/onboarding
  │                             subdirs (incl. PostUpdateToast, DonateTab)
  ├─ lib/                       AuthContext, query-client, app-params,
  │                             useFreshlyUpdated, keybinds, aiState
  └─ utils/                     guestStorage, helpers
base44/
  ├─ entities/                  Conversation, Message, Canvas, Spreadsheet,
  │                             ProjectSpace, SpaceFile, BotConfig, CustomWord,
  │                             UserMemory, GuestUsage, User
  └─ functions/                 createCheckout, getAppVersion
build/                          App icons (icon.ico / icon.icns / icon.png /
                                tray-icon.png / icon.svg source)
public/                         Favicons + PWA manifest + service worker
.github/workflows/build.yml     CI for installers
dist/                           Vite build output (gitignored)
release/                        Electron-builder output (gitignored)
```

---

## Support the project

If Quillosofi has earned its place in your toolbox:

- [**Ko-Fi**](https://ko-fi.com/alarkiusej) — keeps quillosofi.com online and buys feature-shipping time
- [**quillosofi.com**](https://www.quillosofi.com) — the marketing site
- Star this repo — costs nothing, helps a lot

---

## License

Apache-2.0 — see `LICENSE`.

<div align="center">

Quillosofi — Built with care. Designed for you.

</div>
