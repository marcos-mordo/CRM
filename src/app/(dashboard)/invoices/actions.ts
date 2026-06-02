'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { InvoiceStatus } from '@prisma/client';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  productId: z.string().optional().nullable(),
});

const invoiceSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().or(z.literal('')).optional(),
  customerAddress: z.string().max(500).optional(),
  customerTaxId: z.string().max(40).optional(),
  dueDate: z.string(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  currency: z.string().optional(),
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

export async function createInvoice(input: z.infer<typeof invoiceSchema>) {
  const session = await requireAuth();
  const parsed = invoiceSchema.parse(input);
  const { computedLines, subtotal, taxAmount, total } = calc(parsed.lines);
  const count = await prisma.invoice.count({ where: { organizationId: session.user.organizationId } });
  const number = `FAC-${String(count + 1).padStart(5, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      status: 'DRAFT',
      issueDate: new Date(),
      dueDate: new Date(parsed.dueDate),
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail || null,
      customerAddress: parsed.customerAddress,
      customerTaxId: parsed.customerTaxId,
      notes: parsed.notes,
      terms: parsed.terms,
      subtotal,
      taxAmount,
      discount: 0,
      total,
      currency: parsed.currency || 'USD',
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

  revalidatePath('/invoices');
  return { ok: true, id: invoice.id };
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const session = await requireAuth();
  await prisma.invoice.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath('/invoices');
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  const session = await requireAuth();
  await prisma.invoice.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/invoices');
  return { ok: true };
}

export async function registerPayment(invoiceId: string, amount: number, method: string, reference?: string) {
  const session = await requireAuth();
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId, organizationId: session.user.organizationId },
  });

  await prisma.payment.create({
    data: { amount, method, reference, invoiceId },
  });

  const totalPaid = Number(invoice.amountPaid) + amount;
  let status: InvoiceStatus = invoice.status;
  let paidDate = invoice.paidDate;

  if (totalPaid >= Number(invoice.total)) {
    status = 'PAID';
    paidDate = new Date();
  } else if (totalPaid > 0) {
    status = 'PARTIAL';
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: totalPaid, status, paidDate },
  });

  revalidatePath('/invoices');
  return { ok: true };
}
