'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const lineSchema = z.object({
  dealId: z.string().min(1),
  productId: z.string().optional(),
  description: z.string().min(1, 'Descripción obligatoria').max(300),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.number().min(0).max(1_000_000_000),
  discount: z.number().min(0).max(100).default(0),
});

function lineTotal(quantity: number, unitPrice: number, discount: number): number {
  return Math.round(quantity * unitPrice * (1 - discount / 100) * 100) / 100;
}

/** Comprueba que el deal pertenece a la organización del usuario. */
async function assertDealOwned(dealId: string, organizationId: string) {
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
  if (!deal) throw new Error('Oportunidad no encontrada');
}

/** Recalcula deal.amount = suma de líneas (si hay líneas). */
async function recomputeDealAmount(dealId: string) {
  const lines = await prisma.dealLineItem.findMany({ where: { dealId }, select: { total: true } });
  if (lines.length === 0) return; // sin líneas: respeta el importe manual
  const sum = lines.reduce((s, l) => s + Number(l.total), 0);
  await prisma.deal.update({
    where: { id: dealId },
    data: { amount: Math.round(sum * 100) / 100, lastActivityAt: new Date() },
  });
}

export async function addDealLineItem(input: z.infer<typeof lineSchema>) {
  const session = await requireAuth();
  const data = lineSchema.parse(input);
  await assertDealOwned(data.dealId, session.user.organizationId);

  await prisma.dealLineItem.create({
    data: {
      dealId: data.dealId,
      productId: data.productId || null,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discount: data.discount,
      total: lineTotal(data.quantity, data.unitPrice, data.discount),
    },
  });
  await recomputeDealAmount(data.dealId);
  revalidatePath('/pipeline');
  return { ok: true };
}

export async function removeDealLineItem(id: string) {
  const session = await requireAuth();
  const line = await prisma.dealLineItem.findUnique({
    where: { id },
    select: { dealId: true, deal: { select: { organizationId: true } } },
  });
  if (!line || line.deal.organizationId !== session.user.organizationId) throw new Error('Línea no encontrada');
  await prisma.dealLineItem.delete({ where: { id } });
  await recomputeDealAmount(line.dealId);
  revalidatePath('/pipeline');
  return { ok: true };
}

/** Genera una cotización a partir de las líneas del deal (puente CPQ → Quote). */
export async function quoteFromDeal(dealId: string) {
  const session = await requireAuth();
  await assertDealOwned(dealId, session.user.organizationId);
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { lineItems: true, contact: true, company: true },
  });
  if (!deal || deal.lineItems.length === 0) throw new Error('La oportunidad no tiene líneas de producto');

  const subtotal = deal.lineItems.reduce((s, l) => s + Number(l.total), 0);
  const count = await prisma.quote.count({ where: { organizationId: session.user.organizationId } });
  const customerName = deal.company?.name || (deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}`.trim() : deal.title);

  const quote = await prisma.quote.create({
    data: {
      number: `Q-${String(count + 1).padStart(4, '0')}`,
      status: 'DRAFT',
      issueDate: new Date(),
      customerName,
      customerEmail: deal.contact?.email || null,
      subtotal,
      taxAmount: 0,
      discount: 0,
      total: subtotal,
      currency: deal.currency,
      organizationId: session.user.organizationId,
      dealId: deal.id,
      lines: {
        create: deal.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: 0,
          total: l.total,
          productId: l.productId,
        })),
      },
    },
  });
  revalidatePath('/quotes');
  return { ok: true, quoteId: quote.id, number: quote.number };
}
