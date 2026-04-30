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
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (_) {
  // electron-updater not installed; auto-update disabled.
}

const isDev = !app.isPackaged || process.argv.includes('--dev');
const startHidden = process.argv.includes('--hidden');

let mainWindow = null;
let tray = null;
app.isQuitting = false;

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

  // In dev, point at the Vite dev server. In prod, load the built bundle.
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Open external links in the user's default browser, not in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Hide-to-tray instead of full close (unless quitting for real).
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
  const iconPath = path.join(__dirname, '..', 'build', 'tray-icon.png');
  let image;
  try {
    image = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  } catch (_) {
    image = nativeImage.createEmpty();
  }

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
        if (autoUpdater) autoUpdater.checkForUpdatesAndNotify();
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
// IPC
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
// Lifecycle
// =============================================================
app.whenReady().then(() => {
  createWindow();
  createTray();

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

  if (autoUpdater && !isDev) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.checkForUpdatesAndNotify();
    } catch (_) {}
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Stay alive in tray on all platforms; user must explicitly Quit.
});

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch (_) {}
});
