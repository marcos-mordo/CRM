'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { QuoteStatus } from '@prisma/client';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  productId: z.string().optional().nullable(),
});

const quoteSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().or(z.literal('')).optional(),
  customerAddress: z.string().max(500).optional(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  status: z.nativeEnum(QuoteStatus).optional(),
  currency: z.string().optional(),
  dealId: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

function calc(lines: z.infer<typeof lineSchema>[]) {
  let subtotal = 0;
  let taxAmount = 0;
  const computedLines = lines.map((line, idx) => {
    const gross = line.quantity * line.unitPrice;
    const discount = (gross * line.discount) / 100;
    const lineSubtotal = gross - discount;
    const tax = (lineSubtotal * line.taxRate) / 100;
    subtotal += lineSubtotal;
    taxAmount += tax;
    return { ...line, total: lineSubtotal + tax, order: idx };
  });
  return { computedLines, subtotal, taxAmount, total: subtotal + taxAmount };
}

async function nextNumber(orgId: string, prefix: string) {
  const count = await prisma.quote.count({ where: { organizationId: orgId } });
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
}

export async function createQuote(input: z.infer<typeof quoteSchema>) {
  const session = await requireAuth();
  const parsed = quoteSchema.parse(input);
  const { computedLines, subtotal, taxAmount, total } = calc(parsed.lines);
  const number = await nextNumber(session.user.organizationId, 'COT');

  const quote = await prisma.quote.create({
    data: {
      number,
      status: parsed.status ?? 'DRAFT',
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail || null,
      customerAddress: parsed.customerAddress,
      notes: parsed.notes,
      terms: parsed.terms,
      subtotal,
      taxAmount,
      discount: 0,
      total,
      currency: parsed.currency || 'USD',
      dealId: parsed.dealId || null,
      organizationId: session.user.organizationId,
      lines: {
        create: computedLines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          discount: line.discount,
          total: line.total,
          order: line.order,
          productId: line.productId || null,
        })),
      },
    },
  });

  revalidatePath('/quotes');
  return { ok: true, id: quote.id };
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const session = await requireAuth();
  await prisma.quote.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath('/quotes');
  return { ok: true };
}

export async function deleteQuote(id: string) {
  const session = await requireAuth();
  await prisma.quote.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/quotes');
  return { ok: true };
}

export async function convertQuoteToInvoice(quoteId: string) {
  const session = await requireAuth();
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId, organizationId: session.user.organizationId },
    include: { lines: true },
  });

  const count = await prisma.invoice.count({ where: { organizationId: session.user.organizationId } });
  const number = `FAC-${String(count + 1).padStart(5, '0')}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      status: 'DRAFT',
      issueDate: new Date(),
      dueDate,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      notes: quote.notes,
      terms: quote.terms,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      discount: quote.discount,
      total: quote.total,
      currency: quote.currency,
      quoteId: quote.id,
      organizationId: session.user.organizationId,
      lines: {
        create: quote.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          discount: line.discount,
          total: line.total,
          order: line.order,
          productId: line.productId,
        })),
      },
    },
  });

  await prisma.quote.update({ where: { id: quoteId }, data: { status: 'ACCEPTED' } });

  revalidatePath('/quotes');
  revalidatePath('/invoices');
  return { ok: true, invoiceId: invoice.id };
}
