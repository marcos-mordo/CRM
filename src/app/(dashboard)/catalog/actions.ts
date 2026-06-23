'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { BillingFrequency, CommissionType, ProductType } from '@prisma/client';

const productSchema = z.object({
  brandId: z.string(),
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(ProductType).optional(),
  billingFrequency: z.nativeEnum(BillingFrequency).optional(),
  basePrice: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().max(10).optional(),
  active: z.boolean().optional(),
  commissionType: z.nativeEnum(CommissionType).optional().nullable(),
  commissionValue: z.number().min(0).optional().nullable(),
});

export async function createBrandProduct(input: z.infer<typeof productSchema>) {
  const session = await requireAuth();
  const parsed = productSchema.parse(input);
  // Verificar que la marca pertenece a la organización
  const brand = await prisma.brand.findFirst({
    where: { id: parsed.brandId, organizationId: session.user.organizationId },
  });
  if (!brand) throw new Error('Marca no encontrada');

  await prisma.brandProduct.create({
    data: {
      brandId: parsed.brandId,
      sku: parsed.sku,
      name: parsed.name,
      description: parsed.description,
      type: parsed.type ?? 'CUSTOM',
      billingFrequency: parsed.billingFrequency ?? 'ONE_TIME',
      basePrice: parsed.basePrice,
      cost: parsed.cost ?? null,
      taxRate: parsed.taxRate ?? 21,
      currency: parsed.currency ?? 'EUR',
      active: parsed.active ?? true,
      commissionType: parsed.commissionType ?? null,
      commissionValue: parsed.commissionValue ?? null,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/catalog');
  return { ok: true };
}

export async function updateBrandProduct(id: string, input: z.infer<typeof productSchema>) {
  const session = await requireAuth();
  const parsed = productSchema.parse(input);
  await prisma.brandProduct.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      sku: parsed.sku,
      name: parsed.name,
      description: parsed.description,
      type: parsed.type ?? 'CUSTOM',
      billingFrequency: parsed.billingFrequency ?? 'ONE_TIME',
      basePrice: parsed.basePrice,
      cost: parsed.cost ?? null,
      taxRate: parsed.taxRate ?? 21,
      currency: parsed.currency ?? 'EUR',
      active: parsed.active ?? true,
      commissionType: parsed.commissionType ?? null,
      commissionValue: parsed.commissionValue ?? null,
    },
  });
  revalidatePath('/catalog');
  return { ok: true };
}

export async function deleteBrandProduct(id: string) {
  const session = await requireAuth();
  await prisma.brandProduct.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/catalog');
  return { ok: true };
}
