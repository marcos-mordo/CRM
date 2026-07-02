const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let splashWindow = null;
let nextServer = null;
let pgServer = null;
let appUrl = process.env.APP_URL || 'http://localhost:3000';

// ============================================
// Logging a archivo (Electron stdout no se ve cuando no hay consola)
// ============================================

const LOG_DIR = path.join(app.getPath('userData'), 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
const LOG_PATH = path.join(LOG_DIR, 'main.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
  console.log(...args);
}

process.on('uncaughtException', (err) => log('UNCAUGHT', err?.stack ?? err));
process.on('unhandledRejection', (err) => log('UNHANDLED', err?.stack ?? err));

// ============================================
// Utilidades
// ============================================

function findFreePort(start = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(findFreePort(start + 1)));
    server.listen(start, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function getResourcesPath(...sub) {
  if (isDev) return path.join(process.cwd(), ...sub);
  return path.join(process.resourcesPath, 'app', ...sub);
}

function updateSplash(stage) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents
      .executeJavaScript(`document.getElementById('s').textContent = ${JSON.stringify(stage)}`)
      .catch(() => {});
  }
}

// ============================================
// Splash window
// ============================================

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 360,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    backgroundColor: '#7C3AED',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

// ============================================
// Postgres embebido
// ============================================

async function startEmbeddedPostgres() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    log('[pg] usando DATABASE_URL externa, omito embedded');
    return;
  }
  try {
    const dbScript = getResourcesPath('scripts', 'db-start.js');
    if (!fs.existsSync(dbScript)) {
      log('[pg] db-start.js no encontrado en', dbScript, '— se asume DB externa ya levantada');
      return;
    }
    updateSplash('Levantando base de datos…');
    pgServer = spawn(process.execPath, [dbScript], {
      cwd: getResourcesPath(),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pgServer.stdout.on('data', (d) => log('[pg]', d.toString().trim()));
    pgServer.stderr.on('data', (d) => log('[pg-err]', d.toString().trim()));
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('postgres timeout (60s, primer arranque puede tardar)')), 60000);
      // Esperamos al log "PostgreSQL listo." que imprime db-start.js
      // DESPUÉS de crear la DB. NO esperar a "ready to accept connections"
      // porque ese log es del cluster vacío sin la DB brandhub creada.
      pgServer.stdout.on('data', (d) => {
        if (d.toString().includes('PostgreSQL listo')) {
          clearTimeout(t);
          resolve();
        }
      });
      pgServer.on('exit', (code) => {
        clearTimeout(t);
        reject(new Error('postgres exited code=' + code));
      });
    });
    log('[pg] arrancado');
  } catch (err) {
    log('[pg] error:', err.message);
    // No bloqueamos: quizá la DB externa ya está corriendo
  }
}

// ============================================
// Next.js standalone
// ============================================

/**
 * Auto-reparable: en cada arranque comprueba el ESTADO REAL de la DB
 * (no un marker file que puede quedar desincronizado):
 * - Si falta la tabla "User" → aplica init-schema.sql
 * - Si no hay ningún usuario → aplica init-seed.sql (crea admin@brandhub.local)
 * Así una instalación cuyo primer arranque falló a medias se cura sola
 * en el siguiente arranque.
 */
async function applyDbSchema(databaseUrl) {
  const pgPath = path.join(getResourcesPath(), 'node_modules', 'pg');
  let Client;
  try {
    Client = require(pgPath).Client;
  } catch (err) {
    log('[schema] no se pudo cargar pg:', err.message);
    return;
  }

  const c = new Client({ connectionString: databaseUrl });
  try {
    await c.connect();
  } catch (err) {
    log('[schema] DB inaccesible:', err.message);
    return;
  }

  try {
    // ¿Existe la tabla User?
    const t = await c.query(`SELECT to_regclass('public."User"') AS reg`);
    const hasSchema = !!t.rows[0]?.reg;

    if (!hasSchema) {
      updateSplash('Creando esquema de base de datos…');
      const sqlPath = getResourcesPath('scripts', 'init-schema.sql');
      if (!fs.existsSync(sqlPath)) {
        log('[schema] init-schema.sql no encontrado en', sqlPath);
        return;
      }
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      log('[schema] ejecutando init-schema.sql (', sql.length, 'bytes)');
      await c.query(sql);
      log('[schema] schema aplicado OK');
    } else {
      log('[schema] tabla User ya existe, saltando schema');
    }

    // ¿Hay algún usuario? Si no, seed (idempotente con ON CONFLICT)
    const u = await c.query(`SELECT count(*)::int AS n FROM "User"`);
    if (u.rows[0].n === 0) {
      const seedSql = getResourcesPath('scripts', 'init-seed.sql');
      if (fs.existsSync(seedSql)) {
        updateSplash('Creando cuenta inicial…');
        log('[seed] 0 usuarios — aplicando seed (admin@brandhub.local)');
        await c.query(fs.readFileSync(seedSql, 'utf-8'));
        const check = await c.query(`SELECT count(*)::int AS n FROM "User"`);
        log('[seed] OK — usuarios tras seed:', check.rows[0].n);
      } else {
        log('[seed] init-seed.sql no encontrado');
      }
    } else {
      log('[seed]', u.rows[0].n, 'usuarios existentes, saltando seed');
    }
  } catch (err) {
    log('[schema] error:', err.message);
  } finally {
    try { await c.end(); } catch {}
  }
}

async function startNextServer() {
  const port = await findFreePort(3000);
  const host = '127.0.0.1';
  appUrl = `http://${host}:${port}`;
  log('[next] puerto elegido:', port, 'url:', appUrl);

  const databaseUrl = process.env.DATABASE_URL ?? `postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public`;

  // Aplica schema en primer arranque (idempotente, marker en userData)
  await applyDbSchema(databaseUrl);

  updateSplash('Compilando rutas…');

  const serverJs = getResourcesPath('.next', 'standalone', 'server.js');
  if (!fs.existsSync(serverJs)) {
    throw new Error(`server.js no encontrado en ${serverJs}`);
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
      AUTH_TRUST_HOST: 'true',
      DATABASE_URL: databaseUrl,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'desktop-default-secret-please-change',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nextServer.stdout.on('data', (d) => log('[next]', d.toString().trim()));
  nextServer.stderr.on('data', (d) => log('[next-err]', d.toString().trim()));
  nextServer.on('exit', (code) => log('[next] exit code=', code));

  const ok = await waitForServer(appUrl, 45000);
  if (!ok) throw new Error('Next server no respondió en 45s. Revisa logs en ' + LOG_PATH);

  // Chequeo de salud de la DB: si el server está arriba pero la base de
  // datos no responde, el login fallaría en silencio con "credenciales
  // inválidas". Mejor avisar al usuario con un diálogo accionable.
  try {
    const res = await fetch(appUrl + '/api/health');
    const health = await res.json();
    if (!health?.checks?.database?.ok) {
      log('[health] DB degradada:', JSON.stringify(health?.checks));
      dialog.showMessageBox({
        type: 'warning',
        title: 'Base de datos no disponible',
        message: 'BrandHub arrancó pero la base de datos no responde.',
        detail:
          'El login no funcionará hasta que se resuelva.\n\n' +
          'Prueba a cerrar y volver a abrir BrandHub. Si persiste, puede que ' +
          'un antivirus esté bloqueando postgres.exe o que el puerto 5433 esté ocupado.\n\n' +
          'Logs: ' + LOG_PATH,
        buttons: ['Entendido'],
      });
    } else {
      log('[health] DB OK, latencia', health.checks.database.latencyMs, 'ms');
    }
  } catch (err) {
    log('[health] no se pudo verificar salud:', err.message);
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url + '/api/health').catch(() => null);
      if (res && res.status >= 200 && res.status < 600) {
        log('[next] /api/health respondió', res.status);
        return true;
      }
    } catch (e) { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ============================================
// Ventana principal
// ============================================

function createWindow() {
  updateSplash('Cargando interfaz…');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'BrandHub',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0b1220',
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(appUrl);

  // Anti-minimize agresivo durante los primeros 15s: Windows tiende a
  // minimizar BrowserWindow recién creadas en apps no-foreground (lanzadas
  // desde script o helper). Cancelamos cualquier minimize automático.
  let allowMinimize = false;
  setTimeout(() => { allowMinimize = true; }, 15000);
  mainWindow.on('minimize', (e) => {
    if (!allowMinimize) {
      log('[win] minimize bloqueado durante arranque');
      e.preventDefault();
      mainWindow.restore();
      mainWindow.focus();
    }
  });

  const focusWindow = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    log('[win] foco ventana, motivo:', reason);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();

    // Force restore + reposition para evitar el bug de Windows que
    // coloca apps "show:true" iniciales en (-32000, -32000) (minimizadas)
    if (mainWindow.isMinimized()) mainWindow.restore();
    const { width: sw, height: sh } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    const w = Math.min(1400, sw - 60);
    const h = Math.min(900, sh - 80);
    mainWindow.setBounds({ x: Math.floor((sw - w) / 2), y: Math.floor((sh - h) / 2), width: w, height: h });

    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    // flashFrame solo en Windows: notifica al usuario que hay nueva ventana
    if (process.platform === 'win32') mainWindow.flashFrame(true);
    setTimeout(() => mainWindow.flashFrame(false), 1500);

    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  };

  mainWindow.once('ready-to-show', () => focusWindow('ready-to-show'));
  mainWindow.webContents.once('did-finish-load', () => focusWindow('did-finish-load'));
  // Fallback agresivo: a los 8s mostramos sí o sí
  setTimeout(() => focusWindow('timeout-8s'), 8000);

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('[win] did-fail-load', code, desc, url);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(appUrl)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  Menu.setApplicationMenu(process.platform === 'darwin' ? buildMacMenu() : null);
}

function buildMacMenu() {
  return Menu.buildFromTemplate([
    { label: 'BrandHub', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
  ]);
}

// ============================================
// Auto-update
// ============================================

function setupAutoUpdate() {
  if (isDev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', async (info) => {
    const choice = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0, cancelId: 1,
      title: 'Actualización disponible',
      message: `BrandHub ${info.version} está listo para instalarse.`,
    });
    if (choice.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => log('[updater]', err?.message));
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

// ============================================
// Lifecycle
// ============================================

// Single instance: si ya hay una BrandHub abierta, foco esa en vez de
// lanzar segunda (que reventaría con EADDRINUSE 3000 + postmaster.pid lock)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  log('=== BrandHub iniciando, log file:', LOG_PATH);
  log('Platform:', process.platform, 'Arch:', process.arch, 'Electron:', process.versions.electron);
  createSplash();

  try {
    if (!isDev) {
      await startEmbeddedPostgres();
      await startNextServer();
    }
    createWindow();
    setupAutoUpdate();
  } catch (err) {
    log('STARTUP FAILED:', err.stack ?? err.message);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    await dialog.showMessageBox({
      type: 'error',
      title: 'BrandHub no pudo arrancar',
      message: err.message,
      detail: `Logs detallados:\n${LOG_PATH}\n\n¿Quieres abrir la carpeta de logs?`,
      buttons: ['Abrir logs', 'Salir'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) shell.openPath(LOG_DIR);
      app.quit();
    });
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
