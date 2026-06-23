import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { ExecutiveReportPdf } from '@/lib/executive-report-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const monthsBack = Math.min(Math.max(parseInt(searchParams.get('months') ?? '1', 10), 1), 12);

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const orgId = session.user.organizationId;

  const [org, salesAgg, signedCount, customersNew, leadsNew, pendingSign, commPaid, brandsAgg, repsAgg] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: periodStart, lte: periodEnd } },
      _sum: { total: true, totalCommission: true },
      _count: true,
    }),
    prisma.sale.count({ where: { organizationId: orgId, status: 'SIGNED', signedAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.endCustomer.count({ where: { organizationId: orgId, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.lead.count({ where: { organizationId: orgId, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.sale.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'PENDING_SIGN'] } } }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.sale.groupBy({
      by: ['brandId'],
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: periodStart, lte: periodEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ['representativeId'],
      where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
  ]);

  const salesTotal = Number(salesAgg._sum.total ?? 0);
  const brands = await prisma.brand.findMany({
    where: { id: { in: brandsAgg.map((b) => b.brandId) } },
    select: { id: true, name: true },
  });
  const brandsByRevenue = brandsAgg
    .map((b) => {
      const brand = brands.find((x) => x.id === b.brandId);
      return {
        name: brand?.name ?? '?',
        total: Number(b._sum.total ?? 0),
        sales: b._count,
        percent: salesTotal > 0 ? (Number(b._sum.total ?? 0) / salesTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const reps = repsAgg.length
    ? await prisma.user.findMany({ where: { id: { in: repsAgg.map((r) => r.representativeId) } }, select: { id: true, name: true } })
    : [];
  const repsRanking = repsAgg.map((r) => ({
    name: reps.find((u) => u.id === r.representativeId)?.name ?? '?',
    sales: r._count,
    commission: Number(r._sum.amount ?? 0),
  }));

  const periodLabel = monthsBack === 1
    ? periodStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : `${periodStart.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} – ${periodEnd.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;

  const stream = await renderToStream(
    ExecutiveReportPdf({
      orgName: org.name,
      period: periodLabel,
      currency: org.currency,
      generatedAt: new Date(),
      kpis: [
        { label: 'Ventas firmadas', value: String(signedCount), sub: `${salesAgg._count} total con activas` },
        { label: 'Facturación', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: org.currency, maximumFractionDigits: 0 }).format(salesTotal) },
        { label: 'Comisiones pagadas', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: org.currency, maximumFractionDigits: 0 }).format(Number(commPaid._sum.amount ?? 0)) },
        { label: 'Nuevos clientes', value: String(customersNew), sub: `+ ${leadsNew} leads` },
        { label: 'Pendientes firma', value: String(pendingSign) },
        { label: 'Marcas activas', value: String(brandsByRevenue.length) },
        { label: 'Comisión total generada', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: org.currency, maximumFractionDigits: 0 }).format(Number(salesAgg._sum.totalCommission ?? 0)) },
        { label: 'Ticket medio', value: salesAgg._count > 0 ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: org.currency, maximumFractionDigits: 0 }).format(salesTotal / salesAgg._count) : '—' },
      ],
      brandsByRevenue,
      repsRanking,
    })
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  const fname = `reporte-ejecutivo-${periodStart.toISOString().slice(0, 7)}.pdf`;
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fname}"`,
    },
  });
}
