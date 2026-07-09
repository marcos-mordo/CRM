'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * Fusiona contactos duplicados: mueve todas las relaciones al que se
 * conserva, rellena campos vacíos con datos de los duplicados y los borra.
 */
export async function mergeContacts(keepId: string, mergeIds: string[]) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede fusionar');
  const orgId = session.user.organizationId;

  const ids = mergeIds.filter((id) => id !== keepId);
  if (ids.length === 0) throw new Error('Nada que fusionar');

  const [keeper, losers] = await Promise.all([
    prisma.contact.findFirstOrThrow({ where: { id: keepId, organizationId: orgId } }),
    prisma.contact.findMany({ where: { id: { in: ids }, organizationId: orgId } }),
  ]);
  if (losers.length !== ids.length) throw new Error('Algún contacto no existe');

  await prisma.$transaction(async (tx) => {
    // 1. Relaciones simples: repuntar contactId
    await tx.deal.updateMany({ where: { contactId: { in: ids } }, data: { contactId: keepId } });
    await tx.task.updateMany({ where: { contactId: { in: ids } }, data: { contactId: keepId } });
    await tx.activity.updateMany({ where: { contactId: { in: ids } }, data: { contactId: keepId } });
    await tx.ticket.updateMany({ where: { contactId: { in: ids } }, data: { contactId: keepId } });
    await tx.attachment.updateMany({ where: { contactId: { in: ids } }, data: { contactId: keepId } });

    // 2. Tablas con PK compuesta: copiar sin duplicar y borrar las viejas
    const noteLinks = await tx.noteList.findMany({ where: { contactId: { in: ids } } });
    if (noteLinks.length > 0) {
      await tx.noteList.createMany({
        data: noteLinks.map((n) => ({ noteId: n.noteId, contactId: keepId })),
        skipDuplicates: true,
      });
      await tx.noteList.deleteMany({ where: { contactId: { in: ids } } });
    }

    const tagLinks = await tx.contactTag.findMany({ where: { contactId: { in: ids } } });
    if (tagLinks.length > 0) {
      await tx.contactTag.createMany({
        data: tagLinks.map((t) => ({ contactId: keepId, tagId: t.tagId })),
        skipDuplicates: true,
      });
      await tx.contactTag.deleteMany({ where: { contactId: { in: ids } } });
    }

    const listMembers = await tx.emailListMember.findMany({ where: { contactId: { in: ids } } });
    if (listMembers.length > 0) {
      for (const m of listMembers) {
        await tx.emailListMember.upsert({
          where: { listId_contactId: { listId: m.listId, contactId: keepId } },
          create: { listId: m.listId, contactId: keepId, unsubscribed: m.unsubscribed },
          update: {},
        }).catch(() => null);
      }
      await tx.emailListMember.deleteMany({ where: { contactId: { in: ids } } });
    }

    // 3. Rellenar huecos del keeper con datos de los duplicados
    const fill: Record<string, any> = {};
    const FIELDS = ['email', 'phone', 'mobile', 'jobTitle', 'department', 'address', 'city', 'country', 'source', 'companyId'] as const;
    for (const f of FIELDS) {
      if (!(keeper as any)[f]) {
        const donor = losers.find((l) => (l as any)[f]);
        if (donor) fill[f] = (donor as any)[f];
      }
    }
    // Notas: concatenar
    const extraNotes = losers.map((l) => l.notes).filter(Boolean).join('\n---\n');
    if (extraNotes) {
      fill.notes = [keeper.notes, extraNotes].filter(Boolean).join('\n---\n');
    }
    if (Object.keys(fill).length > 0) {
      await tx.contact.update({ where: { id: keepId }, data: fill });
    }

    // 4. Borrar duplicados
    await tx.contact.deleteMany({ where: { id: { in: ids }, organizationId: orgId } });
  });

  revalidatePath('/contacts');
  revalidatePath('/contacts/duplicates');
  return { ok: true, merged: ids.length };
}
