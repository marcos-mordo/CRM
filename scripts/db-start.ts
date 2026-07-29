import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(process.cwd(), '.brandhub-db');
const PORT = 5433;
const USER = 'brandhub';
const PASSWORD = 'brandhub_dev_2026';
const DATABASE = 'brandhub';

async function main() {
  const isFirstRun = !fs.existsSync(DATA_DIR);

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
    console.log('Inicializando PostgreSQL embebido (primera ejecución, descarga binarios)...');
    await pg.initialise();
  }

  console.log(`Arrancando PostgreSQL en puerto ${PORT}...`);
  await pg.start();

  if (isFirstRun) {
    console.log(`Creando base de datos '${DATABASE}'...`);
    await pg.createDatabase(DATABASE);
  } else {
    // Auto-recuperación de un cluster antiguo no-UTF8 (ver db-start.js).
    let Client: any;
    try { Client = (await import('pg')).Client; } catch { /* pg no disponible */ }
    if (Client) {
      let enc: string | null = null;
      const c = new Client({ host: 'localhost', port: PORT, user: USER, password: PASSWORD, database: 'postgres' });
      try {
        await c.connect();
        const r = await c.query('SHOW server_encoding');
        enc = r.rows[0] && r.rows[0].server_encoding;
      } catch (e: any) {
        console.log('[db-start] no se pudo verificar el encoding:', e.message);
      } finally { try { await c.end(); } catch {} }
      console.log('[db-start] encoding del cluster:', enc);
      if (enc && String(enc).toUpperCase() !== 'UTF8') {
        console.log('[db-start] ⚠ cluster con encoding', enc, '(instalación antigua). Recreando limpio en UTF-8...');
        try { await pg.stop(); } catch {}
        const backup = DATA_DIR + '.legacy-' + Date.now();
        try { fs.renameSync(DATA_DIR, backup); }
        catch { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch {} }
        await pg.initialise();
        await pg.start();
        try { await pg.createDatabase(DATABASE); } catch (e: any) { console.log('[db-start] createDatabase:', e.message); }
        console.log('[db-start] ✓ cluster recreado en UTF-8.');
      }
    }
  }

  console.log('');
  console.log('PostgreSQL listo.');
  console.log(`  DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public`);
  console.log('');
  console.log('Deja este proceso abierto. Ctrl+C para parar la DB.');

  const shutdown = async (signal: string) => {
    console.log(`\nRecibido ${signal}, parando PostgreSQL...`);
    await pg.stop();
    console.log('PostgreSQL parado.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Error arrancando PostgreSQL embebido:', err);
  process.exit(1);
});
