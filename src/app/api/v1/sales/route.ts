import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/v1/sales?status=SIGNED&from=2026-01-01&to=2026-06-23&limit=50&offset=0
export async function GET(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['READ_SALES']);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

  const where = {
    organizationId: ctx.organizationId,
    ...(status ? { status: status as any } : {}),
    ...(from || to
      ? {
          saleDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      skip: offset,
      take: limit,
      include: {
        brand: { select: { id: true, name: true } },
        endCustomer: { select: { id: true, isCompany: true, firstName: true, lastName: true, companyName: true, taxId: true } },
        representative: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return NextResponse.json({
    data: sales.map((s) => ({
      id: s.id,
      number: s.number,
      status: s.status,
      saleDate: s.saleDate,
      signedAt: s.signedAt,
      brand: s.brand,
      customer: s.endCustomer,
      representative: s.representative,
      subtotal: Number(s.subtotal),
      taxAmount: Number(s.taxAmount),
      total: Number(s.total),
      totalCommission: Number(s.totalCommission),
      currency: s.currency,
    })),
    pagination: { total, limit, offset },
  });
}

const createSchema = z.object({
  brandId: z.string(),
  endCustomerId: z.string(),
  lines: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(0.01),
  })).min(1),
  notes: z.string().max(2000).optional(),
});

// POST /api/v1/sales — crea una venta (en estado DRAFT, sin firma)
export async function POST(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['WRITE_SALES']);
  if (ctx instanceof NextResponse) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  // Validamos org-scoped
  const [brand, customer, products] = await Promise.all([
    prisma.brand.findFirst({ where: { id: parsed.data.brandId, organizationId: ctx.organizationId } }),
    prisma.endCustomer.findFirst({ where: { id: parsed.data.endCustomerId, organizationId: ctx.organizationId } }),
    prisma.brandProduct.findMany({
      where: {
        id: { in: parsed.data.lines.map((l) => l.productId) },
        organizationId: ctx.organizationId,
        brandId: parsed.data.brandId,
      },
    }),
  ]);

  if (!brand) return NextResponse.json({ error: 'not_found', message: 'Brand not found' }, { status: 404 });
  if (!customer) return NextResponse.json({ error: 'not_found', message: 'Customer not found' }, { status: 404 });
  if (!customer.gdprConsent) {
    return NextResponse.json({ error: 'gdpr_required', message: 'Customer has no GDPR consent on record' }, { status: 422 });
  }
  if (products.length !== parsed.data.lines.length) {
    return NextResponse.json({ error: 'not_found', message: 'One or more products not found in this brand' }, { status: 404 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  let taxAmount = 0;
  let totalCommission = 0;

  const linesData = parsed.data.lines.map((line, idx) => {
    const product = productMap.get(line.productId)!;
    const lineSubtotal = line.quantity * Number(product.basePrice);
    const lineTax = (lineSubtotal * Number(product.taxRate)) / 100;
    const commType = product.commissionType ?? brand.defaultCommissionType;
    const commVal = Number(product.commissionValue ?? brand.defaultCommissionValue);
    const commAmount = commType === 'PERCENTAGE' ? (lineSubtotal * commVal) / 100 : commType === 'FIXED_AMOUNT' ? commVal : 0;
    subtotal += lineSubtotal;
    taxAmount += lineTax;
    totalCommission += commAmount;
    return {
      description: product.name,
      quantity: line.quantity,
      unitPrice: Number(product.basePrice),
      taxRate: Number(product.taxRate),
      discount: 0,
      total: lineSubtotal + lineTax,
      commissionType: commType,
      commissionValue: commVal,
      commissionAmount: commAmount,
      productId: product.id,
      order: idx,
    };
  });

  const count = await prisma.sale.count({ where: { organizationId: ctx.organizationId } });
  const year = new Date().getFullYear();
  const number = `V-${year}-${String(count + 1).padStart(5, '0')}`;

  // Necesitamos un representativeId; usamos el creador del token
  const token = await prisma.apiToken.findUnique({
    where: { id: ctx.tokenId },
    select: { createdById: true },
  });
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sale = await prisma.sale.create({
    data: {
      number,
      status: 'DRAFT',
      currency: products[0]?.currency ?? 'EUR',
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      totalCommission,
      notes: parsed.data.notes,
      syncedAt: new Date(),
      organizationId: ctx.organizationId,
      brandId: brand.id,
      endCustomerId: customer.id,
      representativeId: token.createdById,
      lines: { create: linesData },
    },
    select: { id: true, number: true, status: true, total: true, currency: true, totalCommission: true },
  });

  return NextResponse.json(
    { id: sale.id, number: sale.number, status: sale.status, total: Number(sale.total), currency: sale.currency, commission: Number(sale.totalCommission) },
    { status: 201 }
  );
}
