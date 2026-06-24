import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';
import { ExecutiveReportPdf } from '@/lib/executive-report-pdf';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Endpoint para cron diario. Si es día 1 del mes, envía el PDF
 * ejecutivo del mes anterior por email a todos los OWNER/ADMIN/MANAGER
 * de cada organización activa.
 *
 * Protegido por CRON_SECRET — pasa Authorization: Bearer <secret>
 * o ?secret=... en la query string.
 *
 * Programación recomendada (Vercel cron o cron externo):
 *   0 7 * * *  (todos los días a las 7am)
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_disabled', message: 'CRON_SECRET no configurado' }, { status: 503 });
  }

  const url = new URL(req.url);
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret') ?? '';
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Solo enviar el día 1 del mes (configurable con ?force=1 para tests)
  const today = new Date();
  const force = url.searchParams.get('force') === '1';
  if (today.getDate() !== 1 && !force) {
    return NextResponse.json({ ok: true, skipped: 'not first of month' });
  }

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

  // Solo orgs con suscripción activa (o sin Subscription = plan FREE)
  const orgs = await prisma.organization.findMany({
    include: {
      users: {
        where: { active: true, role: { in: ['OWNER', 'ADMIN', 'MANAGER'] } },
        select: { id: true, name: true, email: true },
      },
    },
  });

  const results: { org: string; sent: number; error?: string }[] = [];

  for (const org of orgs) {
    if (org.users.length === 0) {
      results.push({ org: org.name, sent: 0 });
      continue;
    }

    try {
      const [salesAgg, signedCount, customersNew, leadsNew, pendingSign, commPaid, brandsAgg, repsAgg] = await Promise.all([
        prisma.sale.aggregate({
          where: { organizationId: org.id, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: lastMonth, lte: lastMonthEnd } },
          _sum: { total: true, totalCommission: true },
          _count: true,
        }),
        prisma.sale.count({ where: { organizationId: org.id, status: 'SIGNED', signedAt: { gte: lastMonth, lte: lastMonthEnd } } }),
        prisma.endCustomer.count({ where: { organizationId: org.id, createdAt: { gte: lastMonth, lte: lastMonthEnd } } }),
        prisma.lead.count({ where: { organizationId: org.id, createdAt: { gte: lastMonth, lte: lastMonthEnd } } }),
        prisma.sale.count({ where: { organizationId: org.id, status: { in: ['DRAFT', 'PENDING_SIGN'] } } }),
        prisma.commission.aggregate({
          where: { organizationId: org.id, status: 'PAID', paidAt: { gte: lastMonth, lte: lastMonthEnd } },
          _sum: { amount: true },
        }),
        prisma.sale.groupBy({
          by: ['brandId'],
          where: { organizationId: org.id, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: lastMonth, lte: lastMonthEnd } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.commission.groupBy({
          by: ['representativeId'],
          where: { organizationId: org.id, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: lastMonth, lte: lastMonthEnd } },
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
      ]);

      if (salesAgg._count === 0 && customersNew === 0 && leadsNew === 0) {
        // Mes sin actividad → no enviar email
        results.push({ org: org.name, sent: 0 });
        continue;
      }

      const salesTotal = Number(salesAgg._sum.total ?? 0);
      const brands = await prisma.brand.findMany({
        where: { id: { in: brandsAgg.map((b) => b.brandId) } },
        select: { id: true, name: true },
      });
      const brandsByRevenue = brandsAgg
        .map((b) => ({
          name: brands.find((x) => x.id === b.brandId)?.name ?? '?',
          total: Number(b._sum.total ?? 0),
          sales: b._count,
          percent: salesTotal > 0 ? (Number(b._sum.total ?? 0) / salesTotal) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      const reps = repsAgg.length
        ? await prisma.user.findMany({ where: { id: { in: repsAgg.map((r) => r.representativeId) } }, select: { id: true, name: true } })
        : [];
      const repsRanking = repsAgg.map((r) => ({
        name: reps.find((u) => u.id === r.representativeId)?.name ?? '?',
        sales: r._count,
        commission: Number(r._sum.amount ?? 0),
      }));

      const fmtCur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: org.currency, maximumFractionDigits: 0 }).format(n);

      const pdfBuffer = await renderToBuffer(
        ExecutiveReportPdf({
          orgName: org.name,
          period: lastMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
          currency: org.currency,
          generatedAt: new Date(),
          kpis: [
            { label: 'Ventas firmadas', value: String(signedCount), sub: `${salesAgg._count} total con activas` },
            { label: 'Facturación', value: fmtCur(salesTotal) },
            { label: 'Comisiones pagadas', value: fmtCur(Number(commPaid._sum.amount ?? 0)) },
            { label: 'Nuevos clientes', value: String(customersNew), sub: `+ ${leadsNew} leads` },
            { label: 'Pendientes firma', value: String(pendingSign) },
            { label: 'Marcas activas', value: String(brandsByRevenue.length) },
            { label: 'Comisión total', value: fmtCur(Number(salesAgg._sum.totalCommission ?? 0)) },
            { label: 'Ticket medio', value: salesAgg._count > 0 ? fmtCur(salesTotal / salesAgg._count) : '—' },
          ],
          brandsByRevenue,
          repsRanking,
        })
      );

      let sent = 0;
      for (const user of org.users) {
        try {
          await sendMail({
            to: user.email,
            subject: `Reporte ejecutivo ${lastMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} — ${org.name}`,
            html: `<p>Hola ${user.name.split(' ')[0]},</p>
<p>Aquí va el reporte ejecutivo del mes pasado de <strong>${org.name}</strong>:</p>
<ul>
  <li>Ventas firmadas: <strong>${signedCount}</strong></li>
  <li>Facturación: <strong>${fmtCur(salesTotal)}</strong></li>
  <li>Comisiones pagadas: <strong>${fmtCur(Number(commPaid._sum.amount ?? 0))}</strong></li>
  <li>Nuevos clientes: <strong>${customersNew}</strong></li>
</ul>
<p>El detalle completo está adjunto en el PDF.</p>
<p>— Equipo BrandHub</p>`,
            attachments: [{ filename: `reporte-${lastMonth.toISOString().slice(0, 7)}.pdf`, content: pdfBuffer }],
          });
          sent++;
        } catch (err) {
          console.error(`[cron] failed to send to ${user.email}`, err);
        }
      }
      results.push({ org: org.name, sent });
    } catch (err: any) {
      results.push({ org: org.name, sent: 0, error: err?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
