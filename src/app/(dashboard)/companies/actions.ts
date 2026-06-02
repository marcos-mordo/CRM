'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const companySchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.string().max(80).optional(),
  website: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  size: z.string().max(50).optional(),
  annualRevenue: z.number().optional().nullable(),
  notes: z.string().max(5000).optional(),
});

export async function createCompany(input: z.infer<typeof companySchema>) {
  const session = await requireAuth();
  const parsed = companySchema.parse(input);
  const company = await prisma.company.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      annualRevenue: parsed.annualRevenue ?? null,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/companies');
  return { ok: true, id: company.id };
}

export async function updateCompany(id: string, input: z.infer<typeof companySchema>) {
  const session = await requireAuth();
  const parsed = companySchema.parse(input);
  await prisma.company.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...parsed,
      email: parsed.email || null,
      annualRevenue: parsed.annualRevenue ?? null,
    },
  });
  revalidatePath('/companies');
  return { ok: true };
}

export async function deleteCompany(id: string) {
  const session = await requireAuth();
  await prisma.company.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/companies');
  return { ok: true };
}
