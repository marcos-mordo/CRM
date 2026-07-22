'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ActivityType } from '@prisma/client';
import { recordActivity } from '@/lib/activities';

const activitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  subject: z.string().min(1, 'El asunto es obligatorio').max(200),
  description: z.string().max(5000).optional(),
  occurredAt: z.string().optional(), // ISO; por defecto ahora
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  // Seguimiento opcional (activity-based selling estilo Pipedrive)
  followUpTitle: z.string().max(200).optional(),
  followUpDate: z.string().optional(),
});

export async function logActivity(input: z.infer<typeof activitySchema>) {
  const session = await requireAuth();
  const data = activitySchema.parse(input);

  const activity = await recordActivity(session.user.organizationId, session.user.id, data);

  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);
  revalidatePath('/pipeline');
  revalidatePath('/activities');
  return { ok: true, id: activity.id };
}

export async function deleteActivity(id: string) {
  const session = await requireAuth();
  const activity = await prisma.activity.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true, contactId: true },
  });
  if (!activity) throw new Error('Actividad no encontrada');
  await prisma.activity.delete({ where: { id } });
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  revalidatePath('/activities');
  return { ok: true };
}
