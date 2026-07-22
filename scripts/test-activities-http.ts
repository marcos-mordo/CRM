/** Verifica que /activities y el detalle de contacto renderizan con sesión real. */
const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3100';
const EMAIL = process.env.QA_EMAIL ?? 'admin@acme.com';
const PASS = process.env.QA_PASS ?? 'admin1234';

function cookies(res: Response): string {
  const raw = (res.headers as any).getSetCookie?.() ?? [];
  return raw.map((c: string) => c.split(';')[0]).join('; ');
}

async function login(): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const jar = cookies(csrfRes);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: jar },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, redirect: 'false', json: 'true' }),
    redirect: 'manual',
  });
  return jar + '; ' + cookies(res);
}

async function main() {
  let fail = 0;
  const check = (n: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${n} ${extra}`); if (!ok) fail++; };
  const cookie = await login();

  const a = await fetch(`${BASE}/activities`, { headers: { cookie } });
  const html = await a.text();
  check('/activities responde 200', a.status === 200, `(${a.status})`);
  check('/activities muestra título y acción', html.includes('Actividades') && html.includes('Registrar actividad'));
  check('/activities muestra filtros', html.includes('Llamadas') && html.includes('Reuniones'));

  // Un contacto real para probar el botón en su cabecera
  const cid = process.env.QA_CONTACT_ID;
  if (cid) {
    const c = await fetch(`${BASE}/contacts/${cid}`, { headers: { cookie } });
    const chtml = await c.text();
    check('detalle de contacto 200 + botón actividad', c.status === 200 && chtml.includes('Registrar actividad'), `(${c.status})`);
  }

  console.log(fail === 0 ? '\n✅ Render OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
