/*
 * Quillosofi Desktop — preload bridge
 * Exposes a tiny, safe API on window.quillosofi for the renderer (React app).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quillosofi', {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  quit: () => ipcRenderer.send('app:quit'),
});
