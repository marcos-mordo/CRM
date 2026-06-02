'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const contactSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(40).optional(),
  mobile: z.string().max(40).optional(),
  jobTitle: z.string().max(80).optional(),
  department: z.string().max(80).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  notes: z.string().max(5000).optional(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export async function createContact(input: z.infer<typeof contactSchema>) {
  const session = await requireAuth();
  const parsed = contactSchema.parse(input);

  const contact = await prisma.contact.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      companyId: parsed.companyId || null,
      ownerId: parsed.ownerId || session.user.id,
      organizationId: session.user.organizationId,
    },
  });

  revalidatePath('/contacts');
  return { ok: true, id: contact.id };
}

export async function updateContact(id: string, input: z.infer<typeof contactSchema>) {
  const session = await requireAuth();
  const parsed = contactSchema.parse(input);

  await prisma.contact.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...parsed,
      email: parsed.email || null,
      companyId: parsed.companyId || null,
      ownerId: parsed.ownerId || null,
    },
  });

  revalidatePath('/contacts');
  revalidatePath(`/contacts/${id}`);
  return { ok: true };
}

export async function deleteContact(id: string) {
  const session = await requireAuth();
  await prisma.contact.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/contacts');
  return { ok: true };
}

export async function importContacts(rows: Record<string, string>[]) {
  const session = await requireAuth();
  let created = 0;

  for (const row of rows) {
    if (!row.firstName && !row.lastName) continue;
    try {
      await prisma.contact.create({
        data: {
          firstName: row.firstName || row.first_name || '',
          lastName: row.lastName || row.last_name || '',
          email: row.email || null,
          phone: row.phone || null,
          mobile: row.mobile || null,
          jobTitle: row.jobTitle || row.job_title || null,
          city: row.city || null,
          country: row.country || null,
          source: row.source || 'Importación',
          organizationId: session.user.organizationId,
          ownerId: session.user.id,
        },
      });
      created++;
    } catch (e) {
      console.error('Import row failed:', e);
    }
  }

  revalidatePath('/contacts');
  return { created };
}
