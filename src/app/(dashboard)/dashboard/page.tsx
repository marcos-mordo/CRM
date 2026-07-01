import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Briefcase, DollarSign, Headphones, CheckSquare, TrendingUp, Mail, Store, Handshake, Wallet, FileSignature } from 'lucide-react';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PipelineChart } from '@/components/dashboard/pipeline-chart';
import { DealForecast } from '@/components/dashboard/deal-forecast';
import { OnboardingCard } from '@/components/dashboard/onboarding-card';
import { AiInsightsWidget } from '@/components/dashboard/ai-insights-widget';
import { YoyComparison } from '@/components/dashboard/yoy-comparison';
import { TeamActivityFeed } from '@/components/dashboard/team-activity-feed';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { isAIConfigured } from '@/lib/ai';

export default async function DashboardPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const t = await getTranslations('Dashboard');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Mismo mes año anterior para comparativa YoY
  const startOfYoyMonth = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const endOfYoyMonth = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59);

  const [yoySalesNow, yoySalesPrev, yoyCustomersNow, yoyCustomersPrev, yoyCommNow, yoyCommPrev] = await Promise.all([
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfYoyMonth, lte: endOfYoyMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.endCustomer.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
    prisma.endCustomer.count({ where: { organizationId: orgId, createdAt: { gte: startOfYoyMonth, lte: endOfYoyMonth } } }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: startOfYoyMonth, lte: endOfYoyMonth } },
      _sum: { amount: true },
    }),
  ]);

  const yoyMetrics = [
    { label: 'Facturación', current: Number(yoySalesNow._sum.total ?? 0), previous: Number(yoySalesPrev._sum.total ?? 0), format: 'currency' as const },
    { label: 'Ventas firmadas', current: yoySalesNow._count, previous: yoySalesPrev._count, format: 'number' as const },
    { label: 'Nuevos clientes', current: yoyCustomersNow, previous: yoyCustomersPrev, format: 'number' as const },
    { label: 'Comisiones pagadas', current: Number(yoyCommNow._sum.amount ?? 0), previous: Number(yoyCommPrev._sum.amount ?? 0), format: 'currency' as const },
  ];

  const [
    // CRM core KPIs
    totalContacts, newLeads, openDeals, pipelineValue, openTickets, tasksToday, activeCampaigns,
    // BrandHub KPIs
    activeBrands, brandSalesMonth, commissionsPendingSum, commissionsPaidMonthSum,
    pendingSignSales,
    // Listados
    recentSales, topReps, salesByBrand, salesByMonth,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, status: { in: ['NEW', 'CONTACTED'] } } }),
    prisma.deal.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    prisma.deal.aggregate({
      where: { organizationId: orgId, status: 'OPEN' },
      _sum: { amount: true },
    }),
    prisma.ticket.count({ where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.campaign.count({
      where: { organizationId: orgId, status: { in: ['SCHEDULED', 'SENDING'] } },
    }),
    // BrandHub
    prisma.brand.count({ where: { organizationId: orgId, active: true } }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: { in: ['PENDING', 'APPROVED'] } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.sale.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'PENDING_SIGN'] } } }),
    // Recientes
    prisma.sale.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { brand: true, endCustomer: true, representative: true },
    }),
    prisma.commission.groupBy({
      by: ['representativeId'],
      where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.sale.groupBy({
      by: ['brandId'],
      where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
    // Gráfico ventas BrandHub por mes (últimos 6)
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "saleDate"), 'YYYY-MM') as month,
             COALESCE(SUM(total), 0)::float as total
      FROM "Sale"
      WHERE "organizationId" = ${orgId} AND status IN ('SIGNED', 'ACTIVE')
        AND "saleDate" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "saleDate")
      ORDER BY month ASC
    `.catch(() => []),
  ]);

  // Resolver datos derivados
  const repIds = topReps.map((r) => r.representativeId);
  const reps = repIds.length
    ? await prisma.user.findMany({ where: { id: { in: repIds } } })
    : [];
  const brandIds = salesByBrand.map((s) => s.brandId);
  const brandsInfo = brandIds.length
    ? await prisma.brand.findMany({ where: { id: { in: brandIds } } })
    : [];

  const kpis = [
    {
      label: 'Ventas del mes',
      value: formatCurrency(Number(brandSalesMonth._sum.total ?? 0)),
      sublabel: `${brandSalesMonth._count} ventas`,
      icon: Handshake,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Comisiones pendientes',
      value: formatCurrency(Number(commissionsPendingSum._sum.amount ?? 0)),
      icon: Wallet,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Pagado a reps (mes)',
      value: formatCurrency(Number(commissionsPaidMonthSum._sum.amount ?? 0)),
      icon: DollarSign,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      label: 'Marcas activas',
      value: activeBrands.toString(),
      icon: Store,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Pendientes firmar',
      value: pendingSignSales.toString(),
      icon: FileSignature,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      label: t('kpi.totalContacts'),
      value: totalContacts.toLocaleString(),
      icon: Users,
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      label: t('kpi.openDeals'),
      value: openDeals.toLocaleString(),
      icon: Briefcase,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: t('kpi.tasksToday'),
      value: tasksToday.toString(),
      icon: CheckSquare,
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    },
  ];

  const [hasBrand, hasProduct, hasCustomer, hasSale] = await Promise.all([
    prisma.brand.count({ where: { organizationId: orgId } }).then((n) => n > 0),
    prisma.brandProduct.count({ where: { organizationId: orgId } }).then((n) => n > 0),
    prisma.endCustomer.count({ where: { organizationId: orgId } }).then((n) => n > 0),
    prisma.sale.count({ where: { organizationId: orgId } }).then((n) => n > 0),
  ]);

  const onboardingSteps = [
    { id: 'brand', label: 'Crea tu primera marca', description: 'Añade una empresa representada para empezar.', href: '/brands', done: hasBrand },
    { id: 'product', label: 'Configura el catálogo', description: 'Productos o servicios que ofreces.', href: '/catalog', done: hasProduct },
    { id: 'customer', label: 'Añade un cliente', description: 'Cliente final con consentimiento RGPD.', href: '/end-customers', done: hasCustomer },
    { id: 'sale', label: 'Registra tu primera venta', description: 'Wizard de 3 pasos con firma digital.', href: '/sales-orders', done: hasSale },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('welcome', { name: session.user.name })} />

      <OnboardingCard steps={onboardingSteps} />

      <AiInsightsWidget enabled={isAIConfigured()} />

      <YoyComparison metrics={yoyMetrics} />

      <TeamActivityFeed organizationId={orgId} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{kpi.label}</p>
                    <p className="text-lg sm:text-2xl font-bold leading-tight">{kpi.value}</p>
                    {kpi.sublabel && <p className="text-xs text-muted-foreground">{kpi.sublabel}</p>}
                  </div>
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${kpi.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas BrandHub por mes</CardTitle>
            <CardDescription>Últimos 6 meses (firmadas + activas)</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesByMonth} />
          </CardContent>
        </Card>

        <DealForecast organizationId={session.user.organizationId} />

        <Card>
          <CardHeader>
            <CardTitle>Ventas por marca</CardTitle>
            <CardDescription>Top 5 — total facturado</CardDescription>
          </CardHeader>
          <CardContent>
            {salesByBrand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas todavía</p>
            ) : (
              <ul className="space-y-3">
                {salesByBrand.map((row) => {
                  const brand = brandsInfo.find((b) => b.id === row.brandId);
                  const maxTotal = Math.max(...salesByBrand.map((s) => Number(s._sum.total ?? 0)));
                  const pct = (Number(row._sum.total ?? 0) / maxTotal) * 100;
                  return (
                    <li key={row.brandId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{brand?.name ?? '?'}</span>
                        <span className="font-bold">{formatCurrency(Number(row._sum.total ?? 0))}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{row._count} ventas</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
            <CardDescription>Últimas 5 firmadas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas todavía</p>
            ) : (
              <ul className="space-y-3">
                {recentSales.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-accent transition">
                    <div className="flex-1 min-w-0">
                      <Link href={`/sales-orders/${sale.id}`} className="font-medium hover:underline">
                        {sale.number}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {sale.endCustomer.isCompany ? sale.endCustomer.companyName : `${sale.endCustomer.firstName} ${sale.endCustomer.lastName}`}
                        {' · '}
                        <Badge variant="outline" className="text-xs">{sale.brand.name}</Badge>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(Number(sale.total), sale.currency)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.saleDate)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de representantes</CardTitle>
            <CardDescription>Comisión aprobada + pagada</CardDescription>
          </CardHeader>
          <CardContent>
            {topReps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos todavía</p>
            ) : (
              <ul className="space-y-3">
                {topReps.map((row, idx) => {
                  const rep = reps.find((r) => r.id === row.representativeId);
                  return (
                    <li key={row.representativeId} className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(rep?.name ?? '?')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{rep?.name ?? 'Desconocido'}</p>
                      </div>
                      <span className="font-bold text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(Number(row._sum.amount ?? 0))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
