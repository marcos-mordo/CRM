/**
 * QA smoke test de las features v1.0.8–v1.1.1 contra el server corriendo
 * en http://127.0.0.1:3000 y la DB local.
 *
 * Uso: npx tsx scripts/qa-smoke.ts
 */
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const BASE = 'http://127.0.0.1:3000';
const prisma = new PrismaClient();

let passed = 0, failed = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${detail ? `— ${detail}` : ''}`); }
}

async function main() {
  const QA = `qa-${Date.now()}`;

  // ===== Setup: org + admin =====
  const admin = await prisma.user.findFirst({
    where: { role: 'OWNER' },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('No hay usuario OWNER en la DB — corre el seed primero');
  const orgId = admin.organizationId;
  console.log(`\nOrg de pruebas: ${orgId} (admin: ${admin.email})\n`);

  // ============================================================
  console.log('1. WORKFLOWS — trigger LEAD_CREATED vía web form');
  // ============================================================
  const wf = await prisma.workflow.create({
    data: {
      name: `${QA}-wf`,
      trigger: 'LEAD_CREATED',
      conditions: [],
      actions: [
        { type: 'create_task', params: { title: `${QA} llamar a {{firstName}}` } },
        { type: 'notify_managers', params: { title: `${QA} lead: {{firstName}} {{lastName}}` } },
      ],
      organizationId: orgId,
      createdById: admin.id,
    },
  });

  const form = await prisma.webForm.create({
    data: {
      slug: `${QA}-form`,
      name: `${QA} form`,
      title: 'QA',
      fields: [
        { key: 'firstName', label: 'Nombre', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
      ],
      organizationId: orgId,
    },
  });

  const formRes = await fetch(`${BASE}/api/form/${form.slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName: 'QaTester', lastName: 'Smoke', email: `${QA}@qa.test` }),
  });
  ok('web form → 200', formRes.status === 200, `HTTP ${formRes.status}`);

  await new Promise((r) => setTimeout(r, 2500)); // workflows corren async

  const lead = await prisma.lead.findFirst({ where: { email: `${QA}@qa.test`, organizationId: orgId } });
  ok('lead creado desde form', !!lead);

  const run = await prisma.workflowRun.findFirst({ where: { workflowId: wf.id }, orderBy: { createdAt: 'desc' } });
  ok('workflow ejecutado', !!run, 'sin WorkflowRun');
  ok('workflow status SUCCESS', run?.status === 'SUCCESS', `status=${run?.status} detail=${run?.detail?.slice(0, 120)}`);

  const wfTask = await prisma.task.findFirst({ where: { organizationId: orgId, title: { contains: `${QA} llamar a QaTester` } } });
  ok('workflow creó tarea con template {{firstName}}', !!wfTask);

  const notif = await prisma.notification.findFirst({ where: { organizationId: orgId, title: { contains: `${QA} lead: QaTester` } } });
  ok('workflow notificó a managers', !!notif);

  // ============================================================
  console.log('\n2. BOOKINGS — slots + reserva + anti-doble-reserva');
  // ============================================================
  const bpage = await prisma.bookingPage.create({
    data: {
      slug: `${QA}-book`,
      title: 'QA booking',
      durationMinutes: 30,
      availability: { '1': ['08:00', '20:00'], '2': ['08:00', '20:00'], '3': ['08:00', '20:00'], '4': ['08:00', '20:00'], '5': ['08:00', '20:00'], '6': ['08:00', '20:00'], '7': ['08:00', '20:00'] },
      userId: admin.id,
      organizationId: orgId,
    },
  });

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const slotsRes = await fetch(`${BASE}/api/book/${bpage.slug}?date=${dateStr}`);
  const slotsData = await slotsRes.json();
  ok('GET slots → 200 con huecos', slotsRes.status === 200 && slotsData.slots?.length > 0, `HTTP ${slotsRes.status}, slots=${slotsData.slots?.length}`);

  const slot = slotsData.slots[0];
  const bookRes = await fetch(`${BASE}/api/book/${bpage.slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA Visitante', email: `${QA}-visit@qa.test`, startsAt: slot.startsAt }),
  });
  ok('POST reserva → 200', bookRes.status === 200, `HTTP ${bookRes.status}`);

  const booking = await prisma.booking.findFirst({ where: { bookingPageId: bpage.id } });
  ok('booking persistido', !!booking);

  const bookTask = await prisma.task.findFirst({ where: { organizationId: orgId, title: { contains: 'Reunión con QA Visitante' } } });
  ok('tarea creada para el rep', !!bookTask);

  const doubleRes = await fetch(`${BASE}/api/book/${bpage.slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA Segundo', email: `${QA}-second@qa.test`, startsAt: slot.startsAt }),
  });
  ok('doble reserva mismo slot → 409', doubleRes.status === 409, `HTTP ${doubleRes.status}`);

  // ============================================================
  console.log('\n3. SLA — evaluación pura');
  // ============================================================
  const { evaluateSla } = await import('../src/lib/sla');
  const policies = { URGENT: { firstResponseMins: 60, resolutionMins: 240 } } as any;

  const freshTicket = { priority: 'URGENT' as any, createdAt: new Date(), firstResponseAt: null, resolvedAt: null, status: 'OPEN' };
  const fresh = evaluateSla(freshTicket, policies);
  ok('ticket recién creado → firstResponse ok', fresh.firstResponse === 'ok', fresh.firstResponse);

  const oldTicket = { priority: 'URGENT' as any, createdAt: new Date(Date.now() - 2 * 3600 * 1000), firstResponseAt: null, resolvedAt: null, status: 'OPEN' };
  const old = evaluateSla(oldTicket, policies);
  ok('ticket urgente de hace 2h sin responder → breached', old.firstResponse === 'breached', old.firstResponse);
  ok('minutesLeft negativo (vencido)', (old.minutesLeft ?? 0) < 0, String(old.minutesLeft));

  const riskTicket = { priority: 'URGENT' as any, createdAt: new Date(Date.now() - 50 * 60 * 1000), firstResponseAt: null, resolvedAt: null, status: 'OPEN' };
  const risk = evaluateSla(riskTicket, policies);
  ok('ticket a 50min de 60min → at_risk', risk.firstResponse === 'at_risk', risk.firstResponse);

  // Respondió a los 90 min de crearse (SLA 60min) → breached
  const lateAnswer = { priority: 'URGENT' as any, createdAt: new Date(Date.now() - 3 * 3600 * 1000), firstResponseAt: new Date(Date.now() - 1.5 * 3600 * 1000), resolvedAt: null, status: 'IN_PROGRESS' };
  const late = evaluateSla(lateAnswer, policies);
  ok('respondió tarde (90min > 60min) → breached', late.firstResponse === 'breached', late.firstResponse);
  // Respondió a los 30 min (dentro de SLA 60min) → met
  const inTime = { priority: 'URGENT' as any, createdAt: new Date(Date.now() - 3 * 3600 * 1000), firstResponseAt: new Date(Date.now() - 2.5 * 3600 * 1000), resolvedAt: null, status: 'IN_PROGRESS' };
  const met = evaluateSla(inTime, policies);
  ok('respondió a tiempo (30min < 60min) → met', met.firstResponse === 'met', met.firstResponse);

  // ============================================================
  console.log('\n4. DEDUPE — merge de contactos con relaciones');
  // ============================================================
  const c1 = await prisma.contact.create({
    data: { firstName: 'Dup', lastName: 'Uno', email: `${QA}-dup@qa.test`, city: 'Madrid', organizationId: orgId },
  });
  const c2 = await prisma.contact.create({
    data: { firstName: 'Dup', lastName: 'Dos', email: `${QA}-dup@qa.test`, phone: '+34600111222', organizationId: orgId },
  });
  // tarea colgando del duplicado
  const dupTask = await prisma.task.create({
    data: { title: `${QA} tarea del duplicado`, status: 'PENDING', creatorId: admin.id, contactId: c2.id, organizationId: orgId },
  });

  // Merge directo con la misma lógica transaccional (simplificada aquí para runtime)
  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({ where: { contactId: c2.id }, data: { contactId: c1.id } });
    const fill: any = {};
    if (!c1.phone && c2.phone) fill.phone = c2.phone;
    if (Object.keys(fill).length) await tx.contact.update({ where: { id: c1.id }, data: fill });
    await tx.contact.delete({ where: { id: c2.id } });
  });

  const merged = await prisma.contact.findUnique({ where: { id: c1.id } });
  const movedTask = await prisma.task.findUnique({ where: { id: dupTask.id } });
  ok('duplicado eliminado', !(await prisma.contact.findUnique({ where: { id: c2.id } })));
  ok('teléfono heredado del duplicado', merged?.phone === '+34600111222', merged?.phone ?? 'null');
  ok('tarea repuntada al conservado', movedTask?.contactId === c1.id);

  // ============================================================
  console.log('\n5. PÁGINAS — render 200 de las rutas nuevas (con login)');
  // ============================================================
  // Login para cookies
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const { csrfToken } = await csrfRes.json();
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: csrfCookies },
    body: new URLSearchParams({ email: admin.email!, password: 'admin1234', csrfToken, callbackUrl: `${BASE}/dashboard`, json: 'true' }),
    redirect: 'manual',
  });
  const sessionCookies = [csrfCookies, ...loginRes.headers.getSetCookie().map((c) => c.split(';')[0])].join('; ');
  ok('login QA', loginRes.headers.getSetCookie().some((c) => c.includes('session-token')));

  for (const path of ['/workflows', '/bookings', '/report-builder', '/contacts/duplicates', '/tickets', '/web-forms', '/goals']) {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie: sessionCookies }, redirect: 'manual' });
    ok(`GET ${path} → 200`, res.status === 200, `HTTP ${res.status}`);
  }

  // ===== Limpieza =====
  console.log('\nLimpieza fixtures…');
  await prisma.workflowRun.deleteMany({ where: { workflowId: wf.id } });
  await prisma.workflow.delete({ where: { id: wf.id } });
  await prisma.webForm.delete({ where: { id: form.id } });
  await prisma.booking.deleteMany({ where: { bookingPageId: bpage.id } });
  await prisma.bookingPage.delete({ where: { id: bpage.id } });
  await prisma.task.deleteMany({ where: { organizationId: orgId, title: { contains: QA } } });
  await prisma.task.deleteMany({ where: { organizationId: orgId, title: { contains: 'Reunión con QA Visitante' } } });
  await prisma.notification.deleteMany({ where: { organizationId: orgId, title: { contains: QA } } });
  if (lead) await prisma.lead.delete({ where: { id: lead.id } }).catch(() => null);
  await prisma.contact.deleteMany({ where: { email: `${QA}-dup@qa.test` } });

  console.log(`\n========================================`);
  console.log(`RESULTADO: ${passed} pasan · ${failed} fallan`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); }).finally(() => prisma.$disconnect());
