const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextServer = null;
let pgServer = null;
let appUrl = process.env.APP_URL || 'http://localhost:3000';

// ============================================
// Utilidades
// ============================================

function findFreePort(start = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.listen(start, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findFreePort(start + 1)));
  });
}

function getResourcesPath(...sub) {
  // En dev, el cwd es la raíz del proyecto
  // En producción empaquetada, los recursos están en process.resourcesPath/app
  if (isDev) return path.join(process.cwd(), ...sub);
  return path.join(process.resourcesPath, 'app', ...sub);
}

// ============================================
// Postgres embebido como hijo (opcional)
// Solo se arranca si existe pg-data o si el usuario lo configuró.
// Si DATABASE_URL apunta a un host externo, no levantamos nada.
// ============================================

async function startEmbeddedPostgres() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    console.log('[pg] usando DATABASE_URL externa, no arranco postgres embebido');
    return;
  }
  try {
    const dbScript = getResourcesPath('scripts', 'db-start.js');
    if (!fs.existsSync(dbScript)) {
      console.log('[pg] script db-start no encontrado, saltando postgres embebido');
      return;
    }
    pgServer = spawn(process.execPath, [dbScript], {
      cwd: getResourcesPath(),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pgServer.stdout.on('data', (d) => console.log('[pg]', d.toString().trim()));
    pgServer.stderr.on('data', (d) => console.error('[pg]', d.toString().trim()));
    // Esperamos a "PostgreSQL listo"
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 15000);
      pgServer.stdout.on('data', (d) => {
        if (d.toString().includes('listo')) {
          clearTimeout(t);
          resolve();
        }
      });
    });
    console.log('[pg] arrancado');
  } catch (err) {
    console.error('[pg] error:', err.message);
  }
}

// ============================================
// Next.js standalone como hijo
// ============================================

async function startNextServer() {
  const port = await findFreePort(3000);
  const host = '127.0.0.1';
  appUrl = `http://${host}:${port}`;

  const serverJs = getResourcesPath('.next', 'standalone', 'server.js');
  if (!fs.existsSync(serverJs)) {
    console.error('[next] no encontrado en', serverJs);
    return;
  }

  nextServer = spawn(process.execPath, [serverJs], {
    cwd: getResourcesPath('.next', 'standalone'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      HOSTNAME: host,
      NODE_ENV: 'production',
      NEXTAUTH_URL: appUrl,
      DATABASE_URL: process.env.DATABASE_URL ?? `postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public`,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'desktop-default-secret-please-change',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nextServer.stdout.on('data', (d) => console.log('[next]', d.toString().trim()));
  nextServer.stderr.on('data', (d) => console.error('[next]', d.toString().trim()));

  // Espera a que el server responda
  await waitForServer(appUrl, 20000);
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url + '/api/health').catch(() => fetch(url));
      if (res && res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ============================================
// Ventana principal
// ============================================

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
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(appUrl);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(appUrl)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'BrandHub',
          submenu: [
            { role: 'about' }, { type: 'separator' },
            { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
            { type: 'separator' }, { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
            { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
          ],
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
            { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
            { type: 'separator' }, { role: 'togglefullscreen' },
          ],
        },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

// ============================================
// Auto-update
// ============================================

function setupAutoUpdate() {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('update-downloaded', async (info) => {
    const choice = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0, cancelId: 1,
      title: 'Actualización disponible',
      message: `BrandHub ${info.version} está listo para instalarse.`,
      detail: 'La aplicación se reiniciará para aplicar la actualización.',
    });
    if (choice.response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => console.error('[updater]', err?.message));
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

// ============================================
// Lifecycle
// ============================================

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      await startEmbeddedPostgres();
      await startNextServer();
    }
    createWindow();
    setupAutoUpdate();
  } catch (err) {
    console.error('Startup failed:', err);
    dialog.showErrorBox('Error al arrancar', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  try { nextServer?.kill(); } catch {}
  try { pgServer?.kill(); } catch {}
});
