import { prisma } from './prisma';
import { notify } from './notifications';

/**
 * Envía recordatorios de las tareas que vencen hoy o están vencidas y que
 * todavía no se han recordado. Idempotente: marca reminderSentAt para no
 * repetir. Devuelve cuántos recordatorios se enviaron.
 */
export async function sendDueTaskReminders(now: Date = new Date()): Promise<number> {
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const due = await prisma.task.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      assigneeId: { not: null },
      reminderSentAt: null,
      dueDate: { not: null, lte: endOfToday },
    },
    select: {
      id: true, title: true, dueDate: true, assigneeId: true, organizationId: true,
      contactId: true, dealId: true, leadId: true,
    },
    take: 500,
  });

  let sent = 0;
  for (const t of due) {
    const overdue = t.dueDate! < new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const link = t.contactId ? `/contacts/${t.contactId}` : t.dealId ? '/pipeline' : '/tasks';
    await notify({
      organizationId: t.organizationId,
      userId: t.assigneeId!,
      type: 'TASK_DUE',
      title: overdue ? `Tarea vencida: ${t.title}` : `Tarea vence hoy: ${t.title}`,
      message: overdue ? 'Esta tarea pasó su fecha de vencimiento.' : 'Esta tarea vence hoy.',
      link,
      metadata: { taskId: t.id },
    });
    await prisma.task.update({ where: { id: t.id }, data: { reminderSentAt: now } });
    sent++;
  }
  return sent;
}
