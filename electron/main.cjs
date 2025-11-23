const { app, BrowserWindow } = require('electron');
const path = require('path');

// --- 1. PROTOCOL REGISTRATION ---
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('p2pshare', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('p2pshare');
}

// --- 2. DISABLE mDNS (Local Network Fix) ---
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "Secure P2P Share",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    win = mainWindow; // reference
    win.setMenuBarVisibility(false);

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL('http://localhost:5173');
    }
}

// --- 3. SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            
            // Windows: Extract URL from args
            const url = commandLine.find(arg => arg.startsWith('p2pshare://'));
            if (url) {
                mainWindow.webContents.send('deep-link', url);
            }
        }
    });

    // macOS: Handle open-url event
    app.on('open-url', (event, url) => {
        event.preventDefault();
        if (mainWindow) {
            mainWindow.webContents.send('deep-link', url);
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Handle startup with URL (Windows)
        const url = process.argv.find(arg => arg.startsWith('p2pshare://'));
        if (url) {
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('deep-link', url);
            });
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});