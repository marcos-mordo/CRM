import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { InvoicePdf } from '@/lib/pdf-document';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id, organizationId: session.user.organizationId },
    include: { lines: { orderBy: { order: 'asc' } }, organization: true },
  });

  if (!quote) return new NextResponse('Not found', { status: 404 });

  const stream = await renderToStream(
    InvoicePdf({
      type: 'quote',
      number: quote.number,
      orgName: quote.organization.name,
      orgAddress: quote.organization.address || undefined,
      orgPhone: quote.organization.phone || undefined,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      lines: quote.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discount: Number(l.discount),
        taxRate: Number(l.taxRate),
        total: Number(l.total),
      })),
      subtotal: Number(quote.subtotal),
      taxAmount: Number(quote.taxAmount),
      total: Number(quote.total),
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
    })
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.number}.pdf"`,
    },
  });
}
