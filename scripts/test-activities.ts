/**
 * QA de registro de actividades. Verifica contra la DB real:
 *  - crear actividad ligada a contacto+deal
 *  - reset de deal rotting (lastActivityAt se actualiza)
 *  - actividad sin deal pero con contacto → refresca deals abiertos del contacto
 *  - tarea de seguimiento opcional
 * Ejercita el helper REAL recordActivity() que usa el server action.
 * Limpia lo que crea.
 */
import { PrismaClient } from '@prisma/client';
import { recordActivity } from '../src/lib/activities';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name} ${extra}`); if (!ok) fail++; };

const logActivity = (orgId: string, userId: string, input: any) => recordActivity(orgId, userId, input);

async function main() {
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });
  const orgId = org!.id, userId = user!.id;
  const TAG = `zzact_${Date.now()}`;

  // Fixtures: contacto + deal con lastActivityAt viejo (20 días)
  const oldDate = new Date(Date.now() - 20 * 86400000);
  const contact = await prisma.contact.create({ data: { firstName: 'QA', lastName: TAG, organizationId: orgId } });
  const pipeline = await prisma.pipeline.findFirst({ where: { organizationId: orgId }, include: { stages: true } });
  const deal = await prisma.deal.create({
    data: {
      title: `Deal ${TAG}`, amount: 1000, currency: 'EUR', status: 'OPEN',
      organizationId: orgId, pipelineId: pipeline!.id, stageId: pipeline!.stages[0].id,
      contactId: contact.id, lastActivityAt: oldDate,
    },
  });
  check('fixture: deal marcado como viejo (rotting)', Math.floor((Date.now() - deal.lastActivityAt.getTime()) / 86400000) >= 19);

  // 1. Actividad ligada al deal → resetea rotting
  await logActivity(orgId, userId, { type: 'CALL', subject: 'Llamada QA', dealId: deal.id, contactId: contact.id });
  const d1 = await prisma.deal.findUnique({ where: { id: deal.id } });
  const idle1 = Math.floor((Date.now() - d1!.lastActivityAt.getTime()) / 86400000);
  check('actividad en deal resetea rotting (0 días)', idle1 === 0, `(${idle1}d)`);

  // 2. Actividad solo con contacto refresca deals abiertos del contacto
  await prisma.deal.update({ where: { id: deal.id }, data: { lastActivityAt: oldDate } }); // volver a envejecer
  await logActivity(orgId, userId, { type: 'NOTE', subject: 'Nota QA', contactId: contact.id });
  const d2 = await prisma.deal.findUnique({ where: { id: deal.id } });
  const idle2 = Math.floor((Date.now() - d2!.lastActivityAt.getTime()) / 86400000);
  check('actividad en contacto refresca sus deals abiertos', idle2 === 0, `(${idle2}d)`);

  // 3. Aparece en el timeline del contacto
  const acts = await prisma.activity.findMany({ where: { contactId: contact.id } });
  check('2 actividades en el timeline del contacto', acts.length === 2, `(${acts.length})`);

  // 4. Tarea de seguimiento
  await logActivity(orgId, userId, { type: 'MEETING', subject: 'Reunión QA', contactId: contact.id, followUpTitle: `Seguimiento ${TAG}`, followUpDate: new Date(Date.now() + 3 * 86400000).toISOString() });
  const task = await prisma.task.findFirst({ where: { title: `Seguimiento ${TAG}` } });
  check('tarea de seguimiento creada', !!task && task.dealId === null && task.contactId === contact.id, `(${task ? 'ok' : 'no'})`);

  // Limpieza
  try {
    await prisma.task.deleteMany({ where: { title: { contains: TAG } } });
    await prisma.activity.deleteMany({ where: { contactId: contact.id } });
    await prisma.deal.delete({ where: { id: deal.id } });
    await prisma.contact.delete({ where: { id: contact.id } });
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Actividades OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
