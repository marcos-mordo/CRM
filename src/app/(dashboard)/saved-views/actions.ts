'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { SavedViewEntity } from '@prisma/client';

const createSchema = z.object({
  name: z.string().min(1).max(80),
  entity: z.nativeEnum(SavedViewEntity),
  query: z.string().max(2000),
  shared: z.boolean().optional(),
});

export async function createSavedView(input: z.infer<typeof createSchema>) {
  const session = await requireAuth();
  const parsed = createSchema.parse(input);
  await prisma.savedView.create({
    data: {
      ...parsed,
      shared: parsed.shared ?? false,
      organizationId: session.user.organizationId,
      userId: session.user.id,
    },
  });
  revalidatePath('/');
  return { ok: true };
}

export async function deleteSavedView(id: string) {
  const session = await requireAuth();
  const view = await prisma.savedView.findFirstOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  if (view.userId !== session.user.id && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
    throw new Error('Solo el autor puede eliminar esta vista');
  }
  await prisma.savedView.delete({ where: { id } });
  revalidatePath('/');
  return { ok: true };
}
