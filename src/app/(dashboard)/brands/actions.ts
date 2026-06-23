'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { CommissionType } from '@prisma/client';

const brandSchema = z.object({
  name: z.string().min(1).max(120),
  legalName: z.string().max(200).optional(),
  taxId: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  logo: z.string().max(500).optional(),
  website: z.string().max(200).optional(),
  contactPerson: z.string().max(120).optional(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  contactPhone: z.string().max(40).optional(),
  active: z.boolean().optional(),
  defaultCommissionType: z.nativeEnum(CommissionType).optional(),
  defaultCommissionValue: z.number().min(0).optional(),
});

export async function createBrand(input: z.infer<typeof brandSchema>) {
  const session = await requireAuth();
  const parsed = brandSchema.parse(input);
  const brand = await prisma.brand.create({
    data: {
      ...parsed,
      contactEmail: parsed.contactEmail || null,
      defaultCommissionType: parsed.defaultCommissionType ?? 'PERCENTAGE',
      defaultCommissionValue: parsed.defaultCommissionValue ?? 10,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/brands');
  return { ok: true, id: brand.id };
}

export async function updateBrand(id: string, input: z.infer<typeof brandSchema>) {
  const session = await requireAuth();
  const parsed = brandSchema.parse(input);
  await prisma.brand.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...parsed,
      contactEmail: parsed.contactEmail || null,
    },
  });
  revalidatePath('/brands');
  return { ok: true };
}

export async function deleteBrand(id: string) {
  const session = await requireAuth();
  await prisma.brand.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/brands');
  return { ok: true };
}
