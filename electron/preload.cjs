/*
 * Quillosofi Desktop — preload bridge
 * Exposes a safe API on window.quillosofi for the renderer (React app).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quillosofi', {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  quit: () => ipcRenderer.send('app:quit'),

  // Auto-updater bridge
  updates: {
    status: () => ipcRenderer.invoke('updates:status'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    setSettings: (partial) => ipcRenderer.invoke('updates:setSettings', partial),
    openReleasePage: () => ipcRenderer.invoke('updates:openReleasePage'),
    onState: (cb) => {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on('updates:state', listener);
      return () => ipcRenderer.removeListener('updates:state', listener);
    },
  },
});
