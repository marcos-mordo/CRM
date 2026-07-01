'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
});

export async function bulkDeleteContacts(input: z.infer<typeof bulkSchema>) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede eliminar');
  const parsed = bulkSchema.parse(input);

  const result = await prisma.contact.deleteMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
  });
  revalidatePath('/contacts');
  return { ok: true, count: result.count };
}

export async function bulkAssignOwner(input: z.infer<typeof bulkSchema> & { ownerId: string }) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede modificar');
  const parsed = bulkSchema.parse({ ids: input.ids });

  const result = await prisma.contact.updateMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    data: { ownerId: input.ownerId },
  });
  revalidatePath('/contacts');
  return { ok: true, count: result.count };
}

export async function bulkAddTag(input: z.infer<typeof bulkSchema> & { tagId: string }) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede modificar');
  const parsed = bulkSchema.parse({ ids: input.ids });

  await Promise.all(
    parsed.ids.map((contactId) =>
      prisma.contactTag.upsert({
        where: { contactId_tagId: { contactId, tagId: input.tagId } },
        create: { contactId, tagId: input.tagId },
        update: {},
      })
    )
  );
  revalidatePath('/contacts');
  return { ok: true, count: parsed.ids.length };
}

export async function bulkExportContactsCsv(input: z.infer<typeof bulkSchema>): Promise<string> {
  const session = await requireAuth();
  const parsed = bulkSchema.parse(input);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    include: { company: true, owner: { select: { name: true } } },
  });

  const rows = [
    ['Nombre', 'Apellidos', 'Email', 'Teléfono', 'Móvil', 'Empresa', 'Cargo', 'Ciudad', 'País', 'Propietario'].join(','),
    ...contacts.map((c) =>
      [
        c.firstName,
        c.lastName,
        c.email ?? '',
        c.phone ?? '',
        c.mobile ?? '',
        c.company?.name ?? '',
        c.jobTitle ?? '',
        c.city ?? '',
        c.country ?? '',
        c.owner?.name ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  return rows;
}
