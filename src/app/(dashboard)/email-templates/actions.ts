'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, canManage } from '@/lib/auth-helpers';

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
  htmlContent: z.string().min(10),
  category: z.string().max(80).optional(),
  active: z.boolean().optional(),
});

export async function createEmailTemplate(input: z.infer<typeof templateSchema>) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const parsed = templateSchema.parse(input);
  await prisma.emailTemplate.create({
    data: {
      ...parsed,
      active: parsed.active ?? true,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
    },
  });
  revalidatePath('/email-templates');
  return { ok: true };
}

export async function updateEmailTemplate(id: string, input: z.infer<typeof templateSchema>) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const parsed = templateSchema.parse(input);
  await prisma.emailTemplate.update({
    where: { id, organizationId: session.user.organizationId },
    data: parsed,
  });
  revalidatePath('/email-templates');
  return { ok: true };
}

export async function deleteEmailTemplate(id: string) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  await prisma.emailTemplate.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  revalidatePath('/email-templates');
  return { ok: true };
}
