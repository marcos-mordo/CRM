/**
 * QA de recordatorios de tareas — usa el helper REAL sendDueTaskReminders.
 * Verifica: tarea que vence hoy y vencida generan notificación; futura y
 * completada no; idempotencia (segunda pasada no duplica). Limpia todo.
 */
import { PrismaClient } from '@prisma/client';
import { sendDueTaskReminders } from '../src/lib/task-reminders';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (n: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${n} ${extra}`); if (!ok) fail++; };

async function main() {
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });
  const orgId = org!.id, uid = user!.id;
  const TAG = `zzrem_${Date.now()}`;
  const mk = (title: string, dueOffsetDays: number, status: any = 'PENDING', assign = true) =>
    prisma.task.create({ data: {
      title: `${title} ${TAG}`, status, priority: 'MEDIUM',
      dueDate: new Date(Date.now() + dueOffsetDays * 86400000),
      organizationId: orgId, creatorId: uid, assigneeId: assign ? uid : null,
    }});

  const today = await mk('Vence hoy', 0);
  const overdue = await mk('Vencida', -2);
  const future = await mk('Futura', 5);
  const done = await mk('Completada vencida', -1, 'COMPLETED');
  const unassigned = await mk('Sin responsable', -1, 'PENDING', false);

  const before = await prisma.notification.count({ where: { userId: uid, type: 'TASK_DUE' } });
  const sent1 = await sendDueTaskReminders();
  const after = await prisma.notification.count({ where: { userId: uid, type: 'TASK_DUE' } });

  check('envía recordatorios (>=2: hoy + vencida)', sent1 >= 2, `(${sent1})`);
  check('crea notificaciones TASK_DUE', after - before >= 2, `(+${after - before})`);

  const t = async (id: string) => (await prisma.task.findUnique({ where: { id }, select: { reminderSentAt: true } }))!.reminderSentAt;
  check('tarea de hoy marcada como recordada', (await t(today.id)) !== null);
  check('tarea vencida marcada como recordada', (await t(overdue.id)) !== null);
  check('tarea futura NO recordada', (await t(future.id)) === null);
  check('tarea completada NO recordada', (await t(done.id)) === null);
  check('tarea sin responsable NO recordada', (await t(unassigned.id)) === null);

  // Idempotencia: segunda pasada no vuelve a recordar (reminderSentAt ya puesto)
  const sent2 = await sendDueTaskReminders();
  const ourNotifs = await prisma.notification.count({ where: { userId: uid, type: 'TASK_DUE', title: { contains: TAG } } });
  check('2ª pasada no re-recuerda (idempotente)', sent2 === 0, `(sent2=${sent2})`);
  check('nuestras 2 tareas vencidas tienen 1 notif cada una', ourNotifs === 2, `(${ourNotifs})`);

  // Limpieza
  try {
    await prisma.notification.deleteMany({ where: { userId: uid, type: 'TASK_DUE', title: { contains: TAG } } });
    await prisma.task.deleteMany({ where: { title: { contains: TAG } } });
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Recordatorios OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
