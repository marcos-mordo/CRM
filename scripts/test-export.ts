/**
 * QA runtime del export universal. Arranca el server standalone, hace login y
 * descarga cada entidad en xlsx y csv, validando:
 *  - HTTP 200
 *  - Content-Type correcto
 *  - .xlsx empieza por la firma ZIP "PK" (OOXML es un zip)
 *  - el workbook se puede reabrir con exceljs y tiene cabecera
 * Requiere que el server esté escuchando en BASE (por defecto 127.0.0.1:3100).
 */
import ExcelJS from 'exceljs';
import { exportKeys } from '../src/lib/export-registry';

const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3100';
const EMAIL = process.env.QA_EMAIL ?? 'admin@brandhub.local';
const PASS = process.env.QA_PASS ?? 'admin1234';

async function login(): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = extractCookies(csrfRes);
  const body = new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, redirect: 'false', json: 'true' });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookies },
    body,
    redirect: 'manual',
  });
  const all = cookies + '; ' + extractCookies(res);
  const session = all.split('; ').filter((c) => c.includes('authjs.session-token') || c.includes('__Secure')).join('; ');
  if (!session.includes('session-token')) throw new Error('login falló (sin cookie de sesión)');
  return all;
}

function extractCookies(res: Response): string {
  const raw = (res.headers as any).getSetCookie?.() ?? [];
  return raw.map((c: string) => c.split(';')[0]).join('; ');
}

async function main() {
  let fail = 0;
  const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name} ${extra}`); if (!ok) fail++; };

  const cookie = await login();
  console.log('login OK\n');

  for (const entity of exportKeys()) {
    // XLSX
    const xres = await fetch(`${BASE}/api/export/${entity}?format=xlsx`, { headers: { cookie } });
    const ctype = xres.headers.get('content-type') ?? '';
    const buf = Buffer.from(await xres.arrayBuffer());
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
    let rows = -1, header = '';
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as any);
      const ws = wb.worksheets[0];
      rows = ws.rowCount - 1; // menos cabecera
      header = String(ws.getRow(1).getCell(1).value ?? '');
    } catch { /* deja rows=-1 */ }
    check(
      `xlsx ${entity}`,
      xres.status === 200 && ctype.includes('spreadsheetml') && isZip && rows >= 0 && header.length > 0,
      `(status ${xres.status}, ${buf.length}b, ${rows} filas, cab "${header}")`
    );

    // CSV
    const cres = await fetch(`${BASE}/api/export/${entity}?format=csv`, { headers: { cookie } });
    const csv = await cres.text();
    check(`csv  ${entity}`, cres.status === 200 && csv.includes(','), `(status ${cres.status}, ${csv.length}b)`);
  }

  // Entidad desconocida → 404
  const unk = await fetch(`${BASE}/api/export/nope?format=xlsx`, { headers: { cookie } });
  check('entidad desconocida → 404', unk.status === 404, `(status ${unk.status})`);

  console.log(fail === 0 ? '\n✅ Export universal OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
