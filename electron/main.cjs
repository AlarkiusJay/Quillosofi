/*
 * Quillosofi Desktop — Electron main process
 * Copyright 2026 Alarkius Elvya Jay
 * Licensed under the Apache License, Version 2.0
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  shell,
  globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');

// Optional auto-updater — only loaded if installed (so dev install works without it).
// IMPORTANT: electron-updater MUST live in `dependencies`, not devDependencies.
// electron-builder only bundles `dependencies` into the packaged app, and a
// silently-caught require here was the root cause of v0.4.3 → v0.4.7 "Check for
// Updates does nothing". Surfacing the load failure loudly so this can't regress.
let autoUpdater = null;
let updaterLoadError = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (e) {
  updaterLoadError = (e && e.message) || String(e);
  console.error('[updater] FAILED to load electron-updater:', updaterLoadError);
  console.error('[updater] Auto-updates DISABLED. Check that electron-updater is in `dependencies`.');
}

const isDev = !app.isPackaged || process.argv.includes('--dev');
const startHidden = process.argv.includes('--hidden');

let mainWindow = null;
let tray = null;
app.isQuitting = false;
// Set when an update install is in progress. Forces the app to actually die
// (instead of hiding to tray) so NSIS can delete the old .exe without hitting
// 'Failed to uninstall old application files' (Error 2 = file in use).
app.isInstallingUpdate = false;

// Centralised "prepare to die for an update" sequence. We DO NOT destroy
// windows here — quitAndInstall() handles that itself, and pre-destroying
// them was causing 'window-all-closed' to fire app.exit(0) BEFORE NSIS could
// launch (v0.4.12 regression: Error 2 gone but new version never installed).
// All we need to do is:
//   1. Flag we're installing (so 'close' handlers don't hide-to-tray)
//   2. Kill the tray (it was the actual file-handle culprit on Quillosofi.exe)
//   3. Unregister global shortcuts (cosmetic but tidy)
// Then let electron-updater's quitAndInstall drive the rest.
function prepareForUpdateInstall() {
  app.isQuitting = true;
  app.isInstallingUpdate = true;
  try {
    if (tray) { tray.destroy(); tray = null; }
  } catch (_) {}
  try { globalShortcut.unregisterAll(); } catch (_) {}
}

// =============================================================
// Single-instance lock — focus the existing window if user double-launches
// =============================================================
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// =============================================================
// Update settings (persisted to disk in userData/)
// =============================================================
const userDataPath = () => app.getPath('userData');
const updateSettingsFile = () => path.join(userDataPath(), 'update-settings.json');

const DEFAULT_UPDATE_SETTINGS = {
  autoInstall: true,        // auto-install on next launch
  autoCheck: true,          // check on startup
  channel: 'stable',
};

function loadUpdateSettings() {
  try {
    const raw = fs.readFileSync(updateSettingsFile(), 'utf8');
    return { ...DEFAULT_UPDATE_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {
    return { ...DEFAULT_UPDATE_SETTINGS };
  }
}
function saveUpdateSettings(settings) {
  try {
    fs.mkdirSync(userDataPath(), { recursive: true });
    fs.writeFileSync(updateSettingsFile(), JSON.stringify(settings, null, 2));
  } catch (e) {
    console.warn('Failed to persist update settings:', e.message);
  }
}
let updateSettings = loadUpdateSettings();

// =============================================================
// Update state machine — broadcast to renderer over 'updates:state'
// =============================================================
const updateState = {
  status: 'idle',           // idle | checking | available | not-available | downloading | downloaded | error
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null,
  releaseDate: null,
  downloadPercent: 0,
  error: null,
  lastChecked: null,
};

function emitUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:state', { ...updateState, settings: updateSettings });
  }
}

function wireAutoUpdater() {
  if (!autoUpdater || isDev) return;

  autoUpdater.autoDownload = false;            // we control download timing
  autoUpdater.autoInstallOnAppQuit = false;    // we honor user's autoInstall toggle ourselves
  autoUpdater.allowPrerelease = false;

  // Explicit feed URL — belt-and-suspenders so even older installs whose
  // bundled app-update.yml predates the public-repo rename can still find
  // releases. Public repo, no token required for read.
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'AlarkiusJay',
      repo: 'Quillosofi',
      releaseType: 'release',
    });
  } catch (e) {
    console.warn('setFeedURL failed (will fall back to bundled yml):', e && e.message);
  }

  // Pipe verbose updater logs to stderr so 'Not checked yet' failures stop
  // being silent. Surfaced in the Update tab via the 'error' event below.
  try {
    autoUpdater.logger = {
      info: (...args) => console.log('[updater]', ...args),
      warn: (...args) => console.warn('[updater]', ...args),
      error: (...args) => console.error('[updater]', ...args),
      debug: (...args) => console.log('[updater:debug]', ...args),
    };
  } catch (_) {}

  autoUpdater.on('checking-for-update', () => {
    updateState.status = 'checking';
    updateState.error = null;
    updateState.lastChecked = Date.now();
    emitUpdateState();
  });

  autoUpdater.on('update-available', (info) => {
    updateState.status = 'available';
    updateState.latestVersion = info.version;
    updateState.releaseDate = info.releaseDate || null;
    updateState.releaseNotes =
      typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes || null;
    emitUpdateState();

    // If user has autoInstall on, kick off the download immediately.
    if (updateSettings.autoInstall) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('downloadUpdate failed:', err);
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    updateState.status = 'not-available';
    updateState.latestVersion = info.version;
    updateState.error = null;
    emitUpdateState();
  });

  autoUpdater.on('download-progress', (progress) => {
    updateState.status = 'downloading';
    updateState.downloadPercent = Math.round(progress.percent || 0);
    emitUpdateState();
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateState.status = 'downloaded';
    updateState.latestVersion = info.version;
    updateState.downloadPercent = 100;
    emitUpdateState();

    // If auto-install is on, install on next quit (user can also click Install Now).
    // Do NOT pre-destroy windows — quitAndInstall handles graceful shutdown.
    if (updateSettings.autoInstall) {
      app.once('before-quit', () => {
        app.isQuitting = true;
        app.isInstallingUpdate = true;
        try { if (tray) { tray.destroy(); tray = null; } } catch (_) {}
        try { globalShortcut.unregisterAll(); } catch (_) {}
        // Don't auto-fire on quit — let next launch silently install instead.
        // (This handler is only registered when autoInstall is true.)
      });
    }
  });

  autoUpdater.on('error', (err) => {
    updateState.status = 'error';
    updateState.error = err && err.message ? err.message : String(err);
    emitUpdateState();
  });
}

// =============================================================
// Window
// =============================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: !startHidden,
    backgroundColor: '#0b0b10',
    title: 'Quillosofi',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================================
// Tray
// =============================================================
function createTray() {
  // Windows tray expects .ico for crispness across DPI scales; macOS/Linux
  // do best with PNG. Fall back through a list of candidates so the tray
  // never silently fails to render.
  const buildDir = path.join(__dirname, '..', 'build');
  const candidates = process.platform === 'win32'
    ? ['tray-icon.ico', 'icon.ico', 'tray-icon.png', 'icon.png']
    : ['tray-icon.png', 'icon.png', 'tray-icon.ico'];

  let image = null;
  for (const name of candidates) {
    const p = path.join(buildDir, name);
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          image = img;
          // On macOS, smaller tray icons feel more native.
          if (process.platform === 'darwin') {
            image = img.resize({ width: 18, height: 18 });
          }
          break;
        }
      }
    } catch (_) { /* try next */ }
  }
  if (!image) image = nativeImage.createEmpty();

  tray = new Tray(image);
  tray.setToolTip('Quillosofi');
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Quillosofi',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Check for updates',
      click: () => {
        if (autoUpdater && !isDev) {
          autoUpdater.checkForUpdates().catch((err) => {
            console.warn('check-for-updates failed:', err && err.message);
          });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// =============================================================
// IPC — app
// =============================================================
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
    return true;
  }
  return false;
});
ipcMain.on('app:quit', () => {
  app.isQuitting = true;
  app.quit();
});

// =============================================================
// IPC — updates
// =============================================================
ipcMain.handle('updates:status', () => ({
  ...updateState,
  settings: updateSettings,
  // Diagnostic flags so the renderer can show *why* the updater isn't working
  // instead of pretending everything's fine.
  updaterAvailable: !!autoUpdater,
  updaterLoadError,
  isDev,
}));

ipcMain.handle('updates:check', async () => {
  if (!autoUpdater || isDev) {
    const reason = isDev
      ? 'Auto-updates disabled in dev'
      : `Updater unavailable: ${updaterLoadError || 'electron-updater module not loaded'}`;
    // Push to the state stream so the diagnostic panel + sass tier counter both see it.
    updateState.status = 'error';
    updateState.error = reason;
    updateState.lastChecked = Date.now();
    emitUpdateState();
    return { ok: false, error: reason };
  }
  try {
    const r = await autoUpdater.checkForUpdates();
    return { ok: true, info: r ? r.updateInfo : null };
  } catch (err) {
    updateState.status = 'error';
    updateState.error = err && err.message ? err.message : String(err);
    emitUpdateState();
    return { ok: false, error: updateState.error };
  }
});

ipcMain.handle('updates:download', async () => {
  if (!autoUpdater || isDev) {
    return { ok: false, error: 'Updater unavailable' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle('updates:install', async () => {
  if (!autoUpdater || isDev) {
    return { ok: false, error: 'Updater unavailable' };
  }
  try {
    // v0.4.13: stop pre-destroying windows. The previous flow killed all
    // BrowserWindows synchronously, which fired 'window-all-closed' →
    // app.exit(0) BEFORE the setTimeout could call quitAndInstall(). Result:
    // app exited cleanly, NSIS never ran, no upgrade.
    //
    // New flow:
    //   1. Mark intent (so close handlers stop hiding to tray).
    //   2. Kill the tray (this was the real file-handle culprit on .exe).
    //   3. Call quitAndInstall(isSilent=true, isForceRunAfter=true) — it
    //      gracefully closes all windows itself, then launches NSIS.
    prepareForUpdateInstall();
    // Small tick so the IPC reply lands before we vanish.
    setImmediate(() => {
      try { autoUpdater.quitAndInstall(true, true); } catch (_) {}
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle('updates:setSettings', (_e, partial) => {
  updateSettings = { ...updateSettings, ...(partial || {}) };
  saveUpdateSettings(updateSettings);
  emitUpdateState();
  return updateSettings;
});

ipcMain.handle('updates:openReleasePage', () => {
  shell.openExternal('https://github.com/AlarkiusJay/Quillosofi/releases');
  return true;
});

// =============================================================
// Lifecycle
// =============================================================
app.whenReady().then(() => {
  createWindow();
  createTray();
  wireAutoUpdater();

  // Global hotkey to summon Quillosofi (Ctrl/Cmd+Shift+Q).
  try {
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    });
  } catch (_) {}

  // Initial update check 3s after launch (after window had time to render).
  if (autoUpdater && !isDev && updateSettings.autoCheck) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('Initial update check failed:', err && err.message);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Stay alive in tray on all platforms; user must explicitly Quit.
  //
  // NOTE: We previously called app.exit(0) here when installing an update.
  // That was the bug behind v0.4.12: pre-destroying windows fired this event
  // BEFORE quitAndInstall() could run, so we exited without ever launching
  // NSIS. Now quitAndInstall() handles its own shutdown sequence and will
  // call app.quit() / process exit AFTER spawning the installer. We just
  // need to not interfere.
  if (app.isInstallingUpdate) {
    // Let electron-updater's quitAndInstall drive the exit. No-op here.
    return;
  }
});

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch (_) {}
  try { if (tray) { tray.destroy(); tray = null; } } catch (_) {}
});
