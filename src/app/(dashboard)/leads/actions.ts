'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { LeadStatus } from '@prisma/client';

const leadSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  jobTitle: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  score: z.number().int().min(0).max(100).optional(),
  estimatedValue: z.number().optional().nullable(),
  notes: z.string().max(5000).optional(),
  ownerId: z.string().optional().nullable(),
});

export async function createLead(input: z.infer<typeof leadSchema>) {
  const session = await requireAuth();
  const parsed = leadSchema.parse(input);
  const lead = await prisma.lead.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      ownerId: parsed.ownerId || session.user.id,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/leads');
  return { ok: true, id: lead.id };
}

export async function updateLead(id: string, input: z.infer<typeof leadSchema>) {
  const session = await requireAuth();
  const parsed = leadSchema.parse(input);
  await prisma.lead.update({
    where: { id, organizationId: session.user.organizationId },
    data: { ...parsed, email: parsed.email || null, ownerId: parsed.ownerId || null },
  });
  revalidatePath('/leads');
  return { ok: true };
}

export async function deleteLead(id: string) {
  const session = await requireAuth();
  await prisma.lead.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/leads');
  return { ok: true };
}

export async function convertLead(leadId: string) {
  const session = await requireAuth();
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId, organizationId: session.user.organizationId },
  });

  let companyId: string | null = null;
  if (lead.company) {
    const existing = await prisma.company.findFirst({
      where: { organizationId: session.user.organizationId, name: lead.company },
    });
    if (existing) {
      companyId = existing.id;
    } else {
      const created = await prisma.company.create({
        data: { name: lead.company, organizationId: session.user.organizationId },
      });
      companyId = created.id;
    }
  }

  const contact = await prisma.contact.create({
    data: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      jobTitle: lead.jobTitle,
      source: lead.source,
      notes: lead.notes,
      organizationId: session.user.organizationId,
      ownerId: lead.ownerId || session.user.id,
      companyId,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONVERTED', convertedAt: new Date() },
  });

  revalidatePath('/leads');
  revalidatePath('/contacts');
  return { ok: true, contactId: contact.id };
}
