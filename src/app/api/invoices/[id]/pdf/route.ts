import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { InvoicePdf } from '@/lib/pdf-document';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id, organizationId: session.user.organizationId },
    include: { lines: { orderBy: { order: 'asc' } }, organization: true },
  });

  if (!invoice) return new NextResponse('Not found', { status: 404 });

  const stream = await renderToStream(
    InvoicePdf({
      type: 'invoice',
      number: invoice.number,
      orgName: invoice.organization.name,
      orgAddress: invoice.organization.address || undefined,
      orgPhone: invoice.organization.phone || undefined,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discount: Number(l.discount),
        taxRate: Number(l.taxRate),
        total: Number(l.total),
      })),
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      currency: invoice.currency,
      notes: invoice.notes,
      terms: invoice.terms,
    })
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
