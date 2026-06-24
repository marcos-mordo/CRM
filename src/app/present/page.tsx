import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase, DollarSign, Handshake, Store, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import { formatCurrency, initials } from '@/lib/utils';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { BrandLogo } from '@/components/brand-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default async function PresentPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [salesMonth, commPaidMonth, brandsActive, contactsTotal, dealsOpen, pipelineValue, salesByMonth, topReps, salesByBrand] = await Promise.all([
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true, totalCommission: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.brand.count({ where: { organizationId: orgId, active: true } }),
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.deal.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    prisma.deal.aggregate({ where: { organizationId: orgId, status: 'OPEN' }, _sum: { amount: true } }),
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "saleDate"), 'YYYY-MM') as month,
             COALESCE(SUM(total), 0)::float as total
      FROM "Sale"
      WHERE "organizationId" = ${orgId} AND status IN ('SIGNED', 'ACTIVE')
        AND "saleDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "saleDate")
      ORDER BY month ASC
    `.catch(() => []),
    prisma.commission.groupBy({
      by: ['representativeId'],
      where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.sale.groupBy({
      by: ['brandId'],
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
  ]);

  const repIds = topReps.map((r) => r.representativeId);
  const reps = repIds.length ? await prisma.user.findMany({ where: { id: { in: repIds } } }) : [];
  const brandIds = salesByBrand.map((b) => b.brandId);
  const brandsInfo = brandIds.length ? await prisma.brand.findMany({ where: { id: { in: brandIds } } }) : [];

  const kpis = [
    { label: 'Ventas mes', value: formatCurrency(Number(salesMonth._sum.total ?? 0)), icon: Handshake, color: 'from-emerald-500 to-teal-600' },
    { label: 'Comisión total', value: formatCurrency(Number(salesMonth._sum.totalCommission ?? 0)), icon: Trophy, color: 'from-amber-500 to-orange-600' },
    { label: 'Pagado a reps', value: formatCurrency(Number(commPaidMonth._sum.amount ?? 0)), icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { label: 'Marcas activas', value: brandsActive.toString(), icon: Store, color: 'from-blue-500 to-cyan-600' },
    { label: 'Pipeline abierto', value: formatCurrency(Number(pipelineValue._sum.amount ?? 0)), icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
    { label: 'Oportunidades', value: dealsOpen.toString(), icon: Briefcase, color: 'from-indigo-500 to-purple-600' },
    { label: 'Total contactos', value: contactsTotal.toString(), icon: Users, color: 'from-slate-500 to-slate-600' },
    { label: 'Ventas firmadas', value: salesMonth._count.toString(), icon: Wallet, color: 'from-rose-500 to-red-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={56} />
          <div>
            <h1 className="text-3xl font-bold">{session.user.organizationName}</h1>
            <p className="text-muted-foreground">
              {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Volver al CRM</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${k.color}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                    <p className="text-3xl font-bold mt-2">{k.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${k.color} text-white flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Ventas últimos 12 meses</h2>
            <div className="h-80">
              <SalesChart data={salesByMonth} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Ranking del mes</h2>
            {topReps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos todavía</p>
            ) : (
              <ul className="space-y-3">
                {topReps.map((r, idx) => {
                  const rep = reps.find((u) => u.id === r.representativeId);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <li key={r.representativeId} className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">{medals[idx] ?? `#${idx + 1}`}</div>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{initials(rep?.name ?? '?')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{rep?.name ?? 'Desconocido'}</p>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(Number(r._sum.amount ?? 0))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Marcas más vendidas este mes</h2>
          {salesByBrand.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin ventas todavía</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {salesByBrand.map((b) => {
                const brand = brandsInfo.find((x) => x.id === b.brandId);
                return (
                  <div key={b.brandId} className="border rounded-lg p-3 text-center">
                    <Badge variant="secondary" className="mb-2">{brand?.name ?? '?'}</Badge>
                    <p className="text-2xl font-bold">{formatCurrency(Number(b._sum.total ?? 0))}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b._count} ventas</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pt-4">
        Modo presentación · Pulsa Esc para cerrar · Datos en vivo
      </p>
    </div>
  );
}
