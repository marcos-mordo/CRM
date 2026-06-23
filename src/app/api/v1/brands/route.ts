import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['READ_BRANDS']);
  if (ctx instanceof NextResponse) return ctx;

  const brands = await prisma.brand.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: 'asc' },
    include: {
      products: {
        where: { active: true },
        select: { id: true, sku: true, name: true, type: true, basePrice: true, currency: true },
      },
    },
  });

  return NextResponse.json({
    data: brands.map((b) => ({
      id: b.id,
      name: b.name,
      legalName: b.legalName,
      taxId: b.taxId,
      active: b.active,
      defaultCommissionType: b.defaultCommissionType,
      defaultCommissionValue: Number(b.defaultCommissionValue),
      products: b.products.map((p) => ({ ...p, basePrice: Number(p.basePrice) })),
    })),
  });
}
