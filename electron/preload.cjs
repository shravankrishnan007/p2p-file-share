const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron loaded');
});

contextBridge.exposeInMainWorld('electronAPI', {
    // Expose the deep link event to the renderer
    onDeepLink: (callback) => ipcRenderer.on('deep-link', (_event, value) => callback(value)),
    readClipboard: () => clipboard.readText(),
    writeClipboard: (text) => clipboard.writeText(text)
});