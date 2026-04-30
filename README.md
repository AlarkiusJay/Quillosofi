# Quillosofi

All-in-one AI writing & thinking studio for creators.
By **Alarkius Elvya Jay**.

Quillosofi runs as both a **web app** (Base44) and a **native desktop app**
(Windows `.exe`, macOS `.dmg`, Linux `.AppImage` / `.deb`) from this single repo.

---

## Stack

- **Frontend:** React 18 + Vite + Tailwind + Radix UI
- **Backend:** Base44 (entities, auth, SDK)
- **Desktop:** Electron + electron-builder + electron-updater
- **CI:** GitHub Actions — auto-builds installers for all 3 OSes on every `v*` tag

---

## Local development

```bash
# 1. Install
npm install

# 2. Set Base44 env (only needed for the running app, not the build)
cp .env.local.example .env.local   # (optional; create this if it doesn't exist)
# then edit:
#   VITE_BASE44_APP_ID=...
#   VITE_BASE44_APP_BASE_URL=...

# 3a. Run the web app only
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

Push a tag and the CI builds installers on Windows, macOS, and Linux runners
in parallel and attaches them to a GitHub Release:

```bash
npm version patch       # bumps version + makes a v* tag
git push --follow-tags
```

---

## Repo layout

```
electron/        Electron main + preload (CommonJS)
src/             React app (renderer)
base44/          Base44 entities + functions
build/           App icons (icon.ico / icon.icns / icon.png / tray-icon.png)
dist/            Vite build output (gitignored)
release/        Electron-builder output (gitignored)
.github/workflows/build.yml   CI for installers
```

---

## License

Apache-2.0 — see `LICENSE`.
