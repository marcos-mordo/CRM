'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const createSchema = z.object({
  content: z.string().min(1).max(5000),
  contactIds: z.array(z.string()).optional().default([]),
});

export async function createNote(input: z.infer<typeof createSchema>) {
  const session = await requireAuth();
  const parsed = createSchema.parse(input);

  await prisma.note.create({
    data: {
      content: parsed.content,
      organizationId: session.user.organizationId,
      authorId: session.user.id,
      ...(parsed.contactIds.length > 0
        ? { contacts: { create: parsed.contactIds.map((contactId) => ({ contactId })) } }
        : {}),
    },
  });

  for (const cid of parsed.contactIds) revalidatePath(`/contacts/${cid}`);
  revalidatePath('/contacts');
  return { ok: true };
}

export async function deleteNote(id: string) {
  const session = await requireAuth();
  // Solo el autor o admin pueden borrar
  const note = await prisma.note.findFirstOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  if (note.authorId !== session.user.id && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
    throw new Error('Solo el autor o un admin pueden eliminar la nota');
  }
  await prisma.note.delete({ where: { id } });
  revalidatePath('/contacts');
  return { ok: true };
}
