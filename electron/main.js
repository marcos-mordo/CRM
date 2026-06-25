const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';
const APP_URL = process.env.APP_URL || (isDev ? 'http://localhost:3000' : 'http://localhost:3000');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'BrandHub',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0b1220',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(APP_URL);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Links externos abren en navegador, no dentro del Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Menú mínimo en macOS, oculto en Windows/Linux
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'BrandHub',
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
          ],
        },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

// ============================================
// AUTO-UPDATE desde GitHub releases
// ============================================

function setupAutoUpdate() {
  if (isDev) return; // no auto-update en dev

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[updater] update downloaded:', info.version);
    const choice = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
      title: 'Actualización disponible',
      message: `BrandHub ${info.version} está listo para instalarse.`,
      detail: 'La aplicación se reiniciará para aplicar la actualización.',
    });
    if (choice.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message);
  });

  // Check al arrancar y cada 6 horas
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[updater] initial check failed:', err?.message);
  });
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] periodic check failed:', err?.message);
    });
  }, 6 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdate();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
