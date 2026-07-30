/**
 * Vuelca los datos de la BD apuntada por DATABASE_URL a scripts/init-seed.sql
 * como sentencias INSERT idempotentes-por-arranque (el loader de Electron solo
 * las aplica si no hay usuarios). Se usa para hornear los datos de demo en el
 * instalador sin depender de pg_dump (que no viene con embedded-postgres).
 *
 * Uso: DATABASE_URL=postgresql://... tsx scripts/dump-seed.ts
 */
// @ts-ignore -- 'pg' no trae tipos; este script no se empaqueta con la app
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'init-seed.sql');

// Tablas que nunca queremos volcar (auth/migraciones/efímeras).
const SKIP = new Set([
  '_prisma_migrations', 'Account', 'Session', 'VerificationToken', 'PortalSession', 'PushSubscription',
]);

function q(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

function fmt(val: any, dataType: string): string {
  if (val === null || val === undefined) return 'NULL';
  const dt = dataType.toLowerCase();
  if (dt === 'array') {
    if (Array.isArray(val)) {
      const inner = '{' + val.map((e: any) => '"' + String(e).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
      return q(inner);
    }
    return q(String(val)); // ya viene como '{a,b}' (enum[] no parseado)
  }
  if (dt === 'json' || dt === 'jsonb') return q(JSON.stringify(val)) + '::jsonb';
  if (dt === 'boolean') return val ? 'true' : 'false';
  if (val instanceof Date) return q(val.toISOString());
  if (dt.startsWith('timestamp') || dt === 'date') return q(new Date(val).toISOString());
  if (['numeric', 'integer', 'bigint', 'smallint', 'double precision', 'real'].includes(dt)) return String(val);
  return q(String(val));
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const tablesRes = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'
     ORDER BY table_name`
  );
  const tables: string[] = tablesRes.rows.map((r: any) => r.table_name).filter((t: string) => !SKIP.has(t));

  const parts: string[] = [];
  parts.push('-- Seed BrandHub — generado por scripts/dump-seed.ts. NO editar a mano.');
  parts.push('-- Organización VACÍA: admin@brandhub.local / admin1234');
  parts.push('-- Organización LLENA:  demo@brandhub.com    / demo1234  (Nómada Agency)');
  parts.push('-- Un mes de datos de demo en todos los módulos.');
  parts.push('SET session_replication_role = replica;');
  parts.push('');

  let totalRows = 0;
  const summary: string[] = [];

  for (const table of tables) {
    const colsRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [table]
    );
    const cols: { name: string; type: string }[] = colsRes.rows.map((c: any) => ({ name: c.column_name, type: c.data_type }));
    const colList = cols.map((c) => `"${c.name}"`).join(', ');
    const selList = cols.map((c) => `"${c.name}"`).join(', ');

    const dataRes = await client.query(`SELECT ${selList} FROM "${table}"`);
    if (dataRes.rows.length === 0) continue;

    parts.push(`-- ${table} (${dataRes.rows.length})`);
    for (const row of dataRes.rows) {
      const vals = cols.map((c) => fmt(row[c.name], c.type)).join(', ');
      parts.push(`INSERT INTO "${table}" (${colList}) VALUES (${vals});`);
    }
    parts.push('');
    totalRows += dataRes.rows.length;
    summary.push(`   ${table}: ${dataRes.rows.length}`);
  }

  parts.push('SET session_replication_role = DEFAULT;');
  parts.push('');

  fs.writeFileSync(OUT, parts.join('\n'), 'utf-8');
  await client.end();

  console.log(`✓ init-seed.sql generado: ${totalRows} filas en ${summary.length} tablas`);
  console.log(summary.join('\n'));
  console.log(`→ ${OUT}`);
}

main().catch((e) => { console.error('Error en dump-seed:', e); process.exit(1); });
