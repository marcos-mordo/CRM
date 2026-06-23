import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { generateInsights, isAIConfigured } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST() {
  const session = await requireAuth();
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: 'ai_not_configured', message: 'ANTHROPIC_API_KEY no está configurada' },
      { status: 503 }
    );
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [org, salesAgg, commPending, pendingSign, newCustomers, topRep, topBrand] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { name: true, currency: true } }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: { in: ['PENDING', 'APPROVED'] } },
      _sum: { amount: true },
    }),
    prisma.sale.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'PENDING_SIGN'] } } }),
    prisma.endCustomer.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
    prisma.commission.groupBy({
      by: ['representativeId'],
      where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    }),
    prisma.sale.groupBy({
      by: ['brandId'],
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 1,
    }),
  ]);

  let topRepInfo: { name: string; total: number } | undefined;
  if (topRep[0]) {
    const user = await prisma.user.findUnique({ where: { id: topRep[0].representativeId }, select: { name: true } });
    if (user) topRepInfo = { name: user.name, total: Number(topRep[0]._sum.amount ?? 0) };
  }

  let topBrandInfo: { name: string; total: number } | undefined;
  if (topBrand[0]) {
    const brand = await prisma.brand.findUnique({ where: { id: topBrand[0].brandId }, select: { name: true } });
    if (brand) topBrandInfo = { name: brand.name, total: Number(topBrand[0]._sum.total ?? 0) };
  }

  try {
    const insights = await generateInsights({
      orgName: org.name,
      period: 'este mes (' + startOfMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) + ')',
      salesCount: salesAgg._count,
      salesTotal: Number(salesAgg._sum.total ?? 0),
      commissionsPending: Number(commPending._sum.amount ?? 0),
      topRep: topRepInfo,
      topBrand: topBrandInfo,
      pendingSignSales: pendingSign,
      newCustomers,
      currency: org.currency,
    });
    return NextResponse.json({ insights });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ai_error', message: err?.message ?? 'Error generando insights' },
      { status: 500 }
    );
  }
}
