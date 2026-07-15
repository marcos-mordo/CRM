// Versión JS pura de db-start.ts para embebido en el .exe (sin tsx).
// Mantenida en paralelo a db-start.ts — si tocas uno, toca el otro.

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Cuando corre dentro de Electron, embedded-postgres está en
// resources/app/node_modules/embedded-postgres. Cuando corre standalone
// (npm run db:start.js), está en node_modules/ del proyecto.
let EmbeddedPostgres;
try {
  EmbeddedPostgres = require('embedded-postgres').default ?? require('embedded-postgres');
} catch (e) {
  console.error('No se pudo cargar embedded-postgres:', e.message);
  process.exit(1);
}

// Guarda la DB en %APPDATA%/BrandHub/db cuando corre embebido,
// o en .brandhub-db cuando se ejecuta desde el repo en dev.
const isElectron = !!process.env.ELECTRON_RUN_AS_NODE;
const DATA_DIR = isElectron
  ? path.join(os.homedir(), 'AppData', 'Roaming', 'BrandHub', 'db')
  : path.resolve(process.cwd(), '.brandhub-db');

const PORT = 5433;
const USER = 'brandhub';
const PASSWORD = 'brandhub_dev_2026';
const DATABASE = 'brandhub';

async function main() {
  fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const isFirstRun = !fs.existsSync(DATA_DIR);

  console.log('[db-start] DATA_DIR:', DATA_DIR, 'firstRun:', isFirstRun);

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    // Fuerza UTF-8 en el cluster. Sin esto, initdb en Windows con locale
    // español crea la DB en WIN1252 y cualquier emoji/símbolo Unicode
    // (✓, →, 😀, chino…) rompe las queries con error 22P05.
    initdbFlags: ['--encoding=UTF8', '--lc-collate=C', '--lc-ctype=C'],
  });

  if (isFirstRun) {
    console.log('Inicializando PostgreSQL embebido (primera vez, descarga binarios)...');
    await pg.initialise();
  }

  console.log(`Arrancando PostgreSQL en puerto ${PORT}...`);
  await pg.start();

  if (isFirstRun) {
    console.log(`Creando base de datos '${DATABASE}'...`);
    try { await pg.createDatabase(DATABASE); } catch (e) {
      console.log('[db-start] DB ya existe o error no fatal:', e.message);
    }
  }

  console.log('');
  console.log('PostgreSQL listo.');
  console.log(`  DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public`);

  const shutdown = async (signal) => {
    console.log(`\nRecibido ${signal}, parando PostgreSQL...`);
    try { await pg.stop(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('message', (msg) => { if (msg === 'shutdown') shutdown('IPC'); });

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Error arrancando PostgreSQL embebido:', err);
  process.exit(1);
});
