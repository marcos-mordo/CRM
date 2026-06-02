'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const productSchema = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  price: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  unit: z.string().max(20).optional(),
  stock: z.number().int().optional().nullable(),
  active: z.boolean().optional(),
});

export async function createProduct(input: z.infer<typeof productSchema>) {
  const session = await requireAuth();
  const parsed = productSchema.parse(input);
  await prisma.product.create({
    data: {
      ...parsed,
      cost: parsed.cost ?? null,
      taxRate: parsed.taxRate ?? 0,
      unit: parsed.unit || 'unit',
      stock: parsed.stock ?? null,
      active: parsed.active ?? true,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/products');
  return { ok: true };
}

export async function updateProduct(id: string, input: z.infer<typeof productSchema>) {
  const session = await requireAuth();
  const parsed = productSchema.parse(input);
  await prisma.product.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...parsed,
      cost: parsed.cost ?? null,
      taxRate: parsed.taxRate ?? 0,
      stock: parsed.stock ?? null,
    },
  });
  revalidatePath('/products');
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const session = await requireAuth();
  await prisma.product.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/products');
  return { ok: true };
}
