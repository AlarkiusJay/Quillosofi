/*
 * Quillosofi Desktop — Electron main process
 * Copyright 2026 Alarkius Elvya Jay
 * Licensed under the Apache License, Version 2.0
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');

// v0.4.14: tray icon removed entirely.
// Reasons:
//   1. It duplicated the Update tab's "Check for updates" with a stripped
//      version — confusing surface, no unique value.
//   2. It was the suspected file-handle holder on Quillosofi.exe even after
//      tray.destroy() during update install. Removing it eliminates the
//      whole class of "Error 2" / "won't reinstall after download" issues.
//   3. App still auto-checks for updates on launch (autoCheck setting) and
//      the in-app Update tab handles everything else.
// Side effects: closing the last window now actually quits the app on all
// platforms (no more hide-to-tray). The global Ctrl/Cmd+Shift+Q hotkey
// remains for quick foreground summoning of an already-running instance.

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
app.isQuitting = false;
app.isInstallingUpdate = false;

// v0.4.14: with no tray to destroy and no "hide to tray" close handler, the
// shutdown sequence is dramatically simpler. Just flag intent + drop global
// shortcuts; quitAndInstall() handles the rest of the dance with NSIS.
function prepareForUpdateInstall() {
  app.isQuitting = true;
  app.isInstallingUpdate = true;
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

    // If auto-install is on, just flag intent on next quit. The actual
    // install fires when the user clicks Install & Restart, OR on next
    // launch after they quit normally (electron-updater detects the
    // pending installer and applies it).
    if (updateSettings.autoInstall) {
      app.once('before-quit', () => {
        app.isQuitting = true;
        app.isInstallingUpdate = true;
        try { globalShortcut.unregisterAll(); } catch (_) {}
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

  // v0.4.14: closing the window now actually quits (no tray to hide into).
  mainWindow.on('closed', () => {
    mainWindow = null;
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
  // v0.4.14: no tray, no reason to linger. Quit on all platforms (mac
  // included — no menu bar presence to maintain). If we're mid-install,
  // electron-updater's quitAndInstall drives the exit, so do nothing here.
  if (app.isInstallingUpdate) return;
  app.quit();
});

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch (_) {}
});
