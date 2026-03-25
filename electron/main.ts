const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
// Actually we'll just stick to standard since vite-plugin-electron usually builds it to standard CJS internally
const __dirname_env = __dirname;
// The built directory structure
process.env.DIST = path.join(__dirname_env, '../dist');
let win: any;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

  // initDb(); // Temporarily disabled for UI review
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname_env, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    width: 1280,
    height: 800,
    minHeight: 600,
    minWidth: 800,
    titleBarStyle: 'hidden', // to allow sleek modern design
  });

  win.setMenuBarVisibility(false);

  // Test IPC
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile(path.join(process.env.DIST, 'index.html'))
    win.loadFile(path.join(__dirname_env, '../dist/index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.whenReady().then(createWindow);
