import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { verifyShareToken } from '@/lib/public-share';
import { SaleContractPdf } from '@/lib/sale-contract-pdf';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const saleId = verifyShareToken(token);
  if (!saleId) return new NextResponse('Not found', { status: 404 });

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      lines: { orderBy: { order: 'asc' } },
      brand: true,
      endCustomer: true,
      representative: true,
      organization: true,
    },
  });

  if (!sale) return new NextResponse('Not found', { status: 404 });

  const stream = await renderToStream(
    SaleContractPdf({
      number: sale.number,
      orgName: sale.organization.name,
      orgAddress: sale.organization.address || undefined,
      brandName: sale.brand.name,
      brandLegalName: sale.brand.legalName || undefined,
      brandTaxId: sale.brand.taxId || undefined,
      customer: {
        isCompany: sale.endCustomer.isCompany,
        name: sale.endCustomer.isCompany
          ? sale.endCustomer.companyName!
          : `${sale.endCustomer.firstName} ${sale.endCustomer.lastName}`,
        taxId: sale.endCustomer.taxId || '',
        address: sale.endCustomer.address || undefined,
        city: sale.endCustomer.city || undefined,
        postalCode: sale.endCustomer.postalCode || undefined,
        email: sale.endCustomer.email || undefined,
        phone: sale.endCustomer.mobile || sale.endCustomer.phone || undefined,
      },
      representative: sale.representative.name,
      saleDate: sale.saleDate,
      lines: sale.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        total: Number(l.total),
      })),
      subtotal: Number(sale.subtotal),
      taxAmount: Number(sale.taxAmount),
      total: Number(sale.total),
      currency: sale.currency,
      notes: sale.notes,
      signatureDataUrl: sale.signatureData,
      signedAt: sale.signedAt,
    })
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${sale.number}.pdf"`,
    },
  });
}
