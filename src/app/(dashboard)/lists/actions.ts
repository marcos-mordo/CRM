'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const listSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export async function createList(input: z.infer<typeof listSchema>) {
  const session = await requireAuth();
  const parsed = listSchema.parse(input);
  await prisma.emailList.create({
    data: { ...parsed, organizationId: session.user.organizationId },
  });
  revalidatePath('/lists');
  return { ok: true };
}

export async function deleteList(id: string) {
  const session = await requireAuth();
  await prisma.emailList.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/lists');
  return { ok: true };
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  const session = await requireAuth();
  const list = await prisma.emailList.findUniqueOrThrow({
    where: { id: listId, organizationId: session.user.organizationId },
  });

  for (const contactId of contactIds) {
    try {
      await prisma.emailListMember.create({ data: { listId: list.id, contactId } });
    } catch {
      // ignore duplicate
    }
  }
  revalidatePath('/lists');
  return { ok: true };
}

export async function removeContactFromList(listId: string, contactId: string) {
  const session = await requireAuth();
  await prisma.emailListMember.delete({
    where: { listId_contactId: { listId, contactId } },
  });
  revalidatePath('/lists');
  return { ok: true };
}
