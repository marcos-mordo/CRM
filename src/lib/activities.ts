import { prisma } from './prisma';
import { ActivityType } from '@prisma/client';

export interface RecordActivityInput {
  type: ActivityType;
  subject: string;
  description?: string | null;
  occurredAt?: Date | string | null;
  contactId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  followUpTitle?: string | null;
  followUpDate?: Date | string | null;
}

/**
 * Núcleo de registro de actividad, compartido por el server action y las
 * pruebas. Crea la actividad, refresca el reloj de "deal rotting" del deal
 * vinculado (o de los deals abiertos del contacto) y, opcionalmente, programa
 * una tarea de seguimiento (activity-based selling).
 */
export async function recordActivity(organizationId: string, userId: string, input: RecordActivityInput) {
  const activity = await prisma.activity.create({
    data: {
      type: input.type,
      subject: input.subject,
      description: input.description || null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      organizationId,
      userId,
      contactId: input.contactId || null,
      leadId: input.leadId || null,
      dealId: input.dealId || null,
    },
  });

  const now = new Date();
  if (input.dealId) {
    await prisma.deal.update({ where: { id: input.dealId }, data: { lastActivityAt: now } }).catch(() => null);
  } else if (input.contactId) {
    await prisma.deal.updateMany({
      where: { organizationId, contactId: input.contactId, status: 'OPEN' },
      data: { lastActivityAt: now },
    });
  }

  if (input.followUpTitle && input.followUpTitle.trim()) {
    await prisma.task.create({
      data: {
        title: input.followUpTitle.trim(),
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: input.followUpDate ? new Date(input.followUpDate) : null,
        organizationId,
        creatorId: userId,
        assigneeId: userId,
        contactId: input.contactId || null,
        leadId: input.leadId || null,
        dealId: input.dealId || null,
      },
    });
  }

  return activity;
}
