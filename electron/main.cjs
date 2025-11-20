const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "Secure P2P Share",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    // HIDE MENU BAR (Like a real app)
    win.setMenuBarVisibility(false);

    // INTELLIGENT LOADING
    if (app.isPackaged) {
        // PRODUCTION: Load the built HTML file
        // We use path.join to correctly locate 'dist/index.html' relative to this file
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        // DEVELOPMENT: Load Vite Server
        win.loadURL('http://localhost:5173');
        // Optional: Open DevTools automatically in dev mode
        // win.webContents.openDevTools(); 
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});