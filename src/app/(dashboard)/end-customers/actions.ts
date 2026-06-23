'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const customerSchema = z.object({
  isCompany: z.boolean(),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
  companyName: z.string().max(200).optional(),
  taxId: z.string().max(40).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(40).optional(),
  mobile: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  province: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  notes: z.string().max(5000).optional(),
  gdprConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
});

export async function createEndCustomer(input: z.infer<typeof customerSchema>) {
  const session = await requireAuth();
  const parsed = customerSchema.parse(input);
  const customer = await prisma.endCustomer.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      gdprConsentAt: parsed.gdprConsent ? new Date() : null,
      country: parsed.country || 'España',
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/end-customers');
  return { ok: true, id: customer.id };
}

export async function updateEndCustomer(id: string, input: z.infer<typeof customerSchema>) {
  const session = await requireAuth();
  const parsed = customerSchema.parse(input);
  const existing = await prisma.endCustomer.findUniqueOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  await prisma.endCustomer.update({
    where: { id },
    data: {
      ...parsed,
      email: parsed.email || null,
      gdprConsentAt: parsed.gdprConsent && !existing.gdprConsent ? new Date() : existing.gdprConsentAt,
    },
  });
  revalidatePath('/end-customers');
  return { ok: true };
}

export async function deleteEndCustomer(id: string) {
  const session = await requireAuth();
  await prisma.endCustomer.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/end-customers');
  return { ok: true };
}
