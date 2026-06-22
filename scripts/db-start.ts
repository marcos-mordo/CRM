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
