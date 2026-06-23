'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { CommissionType, SaleStatus } from '@prisma/client';
import type { Brand, BrandProduct } from '@prisma/client';

const lineSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(0.01),
});

const saleSchema = z.object({
  brandId: z.string(),
  endCustomerId: z.string(),
  lines: z.array(lineSchema).min(1),
  notes: z.string().max(2000).optional(),
  signatureData: z.string().optional(),
  signatureMethod: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  clientUuid: z.string().optional(),
});

function resolveCommission(
  brand: Brand,
  product: BrandProduct,
  lineSubtotal: number
): { type: CommissionType; value: number; amount: number } {
  const type = product.commissionType ?? brand.defaultCommissionType;
  const value = Number(product.commissionValue ?? brand.defaultCommissionValue);
  let amount = 0;
  if (type === 'PERCENTAGE') amount = (lineSubtotal * value) / 100;
  else if (type === 'FIXED_AMOUNT') amount = value;
  return { type, value, amount };
}

async function nextSaleNumber(orgId: string) {
  const count = await prisma.sale.count({ where: { organizationId: orgId } });
  const year = new Date().getFullYear();
  return `V-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function createSale(input: z.infer<typeof saleSchema>) {
  const session = await requireAuth();
  const parsed = saleSchema.parse(input);

  const brand = await prisma.brand.findFirstOrThrow({
    where: { id: parsed.brandId, organizationId: session.user.organizationId },
  });
  const customer = await prisma.endCustomer.findFirstOrThrow({
    where: { id: parsed.endCustomerId, organizationId: session.user.organizationId },
  });
  if (!customer.gdprConsent) {
    throw new Error('El cliente no ha dado consentimiento RGPD');
  }
  const products = await prisma.brandProduct.findMany({
    where: {
      id: { in: parsed.lines.map((l) => l.productId) },
      organizationId: session.user.organizationId,
      brandId: brand.id,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let taxAmount = 0;
  let totalCommission = 0;

  const linesData = parsed.lines.map((line, idx) => {
    const product = productMap.get(line.productId);
    if (!product) throw new Error(`Producto ${line.productId} no encontrado`);

    const lineSubtotal = line.quantity * Number(product.basePrice);
    const lineTax = (lineSubtotal * Number(product.taxRate)) / 100;
    const commission = resolveCommission(brand, product, lineSubtotal);

    subtotal += lineSubtotal;
    taxAmount += lineTax;
    totalCommission += commission.amount;

    return {
      description: product.name,
      quantity: line.quantity,
      unitPrice: Number(product.basePrice),
      taxRate: Number(product.taxRate),
      discount: 0,
      total: lineSubtotal + lineTax,
      commissionType: commission.type,
      commissionValue: commission.value,
      commissionAmount: commission.amount,
      productId: product.id,
      order: idx,
    };
  });

  const total = subtotal + taxAmount;
  const status = parsed.status ?? (parsed.signatureData ? 'SIGNED' : 'DRAFT');
  const number = await nextSaleNumber(session.user.organizationId);

  const sale = await prisma.sale.create({
    data: {
      number,
      status,
      saleDate: new Date(),
      signedAt: parsed.signatureData ? new Date() : null,
      currency: products[0]?.currency ?? 'EUR',
      subtotal,
      taxAmount,
      total,
      totalCommission,
      signatureData: parsed.signatureData,
      signatureMethod: parsed.signatureMethod,
      notes: parsed.notes,
      clientUuid: parsed.clientUuid,
      syncedAt: new Date(),
      organizationId: session.user.organizationId,
      brandId: brand.id,
      endCustomerId: customer.id,
      representativeId: session.user.id,
      lines: { create: linesData },
      commissions: {
        create: {
          amount: totalCommission,
          currency: products[0]?.currency ?? 'EUR',
          status: 'PENDING',
          organizationId: session.user.organizationId,
          representativeId: session.user.id,
        },
      },
    },
  });

  revalidatePath('/sales-orders');
  revalidatePath('/commissions');
  return { ok: true, id: sale.id, number: sale.number };
}

export async function setSaleStatus(id: string, status: SaleStatus, cancelReason?: string) {
  const session = await requireAuth();
  const data: any = { status };
  if (status === 'ACTIVE') data.activatedAt = new Date();
  if (status === 'CANCELLED') {
    data.cancelledAt = new Date();
    data.cancelReason = cancelReason;
  }
  if (status === 'REFUNDED') {
    data.cancelledAt = new Date();
    // anular comisiones asociadas
    await prisma.commission.updateMany({
      where: { saleId: id, organizationId: session.user.organizationId },
      data: { status: 'CANCELLED' },
    });
  }
  await prisma.sale.update({
    where: { id, organizationId: session.user.organizationId },
    data,
  });
  revalidatePath('/sales-orders');
  revalidatePath('/commissions');
  return { ok: true };
}

export async function deleteSale(id: string) {
  const session = await requireAuth();
  await prisma.sale.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/sales-orders');
  revalidatePath('/commissions');
  return { ok: true };
}
