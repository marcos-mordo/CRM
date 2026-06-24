'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, canManage } from '@/lib/auth-helpers';

const tagSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function createTag(input: z.infer<typeof tagSchema>) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const parsed = tagSchema.parse(input);
  await prisma.tag.create({
    data: {
      name: parsed.name,
      color: parsed.color ?? '#6366f1',
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function updateTag(id: string, input: z.infer<typeof tagSchema>) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const parsed = tagSchema.parse(input);
  await prisma.tag.update({
    where: { id, organizationId: session.user.organizationId },
    data: parsed,
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function deleteTag(id: string) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  await prisma.tag.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  revalidatePath('/settings');
  return { ok: true };
}
