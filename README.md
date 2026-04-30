<div align="center">

<img src="build/icon.svg" alt="Quillosofi" width="128" />

# Quillosofi

### Your Writing and Creative Companion. Built with Canvases, Custom Dictionary, and More!

`AI-Powered` · `Memory-Aware` · `Privacy First` · `Fully Customizable`

By **Alarkius Elvya Jay**

</div>

---

Quillosofi is an all-in-one AI writing & thinking studio for creators —
chat, brainstorm, draft, and export, all in one place. A **native desktop app** (Windows `.exe`,
macOS `.dmg`, Linux `.AppImage` / `.deb`) from this single repo. Originally forked from https://quillosofi.com/ because it was a web-based app first. 

## What Quillosofi Can Do

### AI Chat
Have rich, context-aware conversations with Quillosofi. It remembers your preferences and adapts to your style.

### Persistent Memory
Quillosofi learns what matters to you. Save facts, preferences, and context that carry across every conversation.

### Project Spaces
Organize your work into dedicated spaces with custom system prompts, reference links, and shared memory.

### Canvas Vault
Write, format, and save rich text canvases directly inside your chats. Export to TXT, MD, DOCX, or PDF.

### Spreadsheets
Build and manage live spreadsheets inside your conversations with conditional formatting and cell types.

### Web Search
Ask Quillosofi anything with live internet context — news, research, facts, and real-time information.

### Full Customization
Choose your theme, font, bot personality, tone, response style, and even create custom AI personas.

### Privacy First
Your data is encrypted, never sold, and always under your control. Export or delete everything at any time.

### Slash Commands
Trigger powerful tools instantly — `/canvas`, `/spreadsheet`, `/search`, and more — right inside any chat.

### Custom Dictionary
Build your own personal vocabulary. Add words, definitions, and categories. Pin words to inject them passively into every AI conversation — perfect for characters, lore, or specialized terms.

---

## Desktop edition

The desktop app gives you everything the web version has, plus:

- **System tray** — runs quietly in the background, click to summon
- **Hide-to-tray** — close the window without quitting
- **Global hotkey** — `Ctrl/Cmd+Shift+Q` to bring Quillosofi forward
- **Single-instance lock** — one Quillosofi at a time, focuses the existing window
- **Auto-updates** — `electron-updater` checks GitHub Releases and installs in the background
- **Branded native installer** with the mint feather icon
- **Data is stored Locally** - We care about privacy. Your data is stored locally in your PC. 

📥 [**Download the latest release →**](https://github.com/AlarkiusJay/Quillosofi/releases/latest)

---

## Stack

- **Frontend:** React 18 + Vite + Tailwind + Radix UI
- **Backend:** Base44 (entities, auth, SDK)
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
  ├─ pages/                     Chat, Settings, Space, CanvasVault, QuillosofiCentre
  ├─ components/                UI + chat/spaces/vault/settings/onboarding subdirs
  ├─ lib/                       AuthContext, query-client, app-params
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

## License

Apache-2.0 — see `LICENSE`.

<div align="center">

Quillosofi — Built with care. Designed for you.
Powered by **Base44**.

</div>
