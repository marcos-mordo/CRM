import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Briefcase, DollarSign, Headphones, CheckSquare, TrendingUp, Mail } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PipelineChart } from '@/components/dashboard/pipeline-chart';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const t = await getTranslations('Dashboard');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    totalContacts,
    newLeads,
    openDeals,
    pipelineValue,
    monthlyRevenue,
    openTickets,
    tasksToday,
    activeCampaigns,
    recentActivities,
    upcomingTasks,
    topDeals,
    salesByMonth,
    pipelineByStage,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, status: { in: ['NEW', 'CONTACTED'] } } }),
    prisma.deal.count({ where: { organizationId: orgId, status: 'OPEN' } }),
    prisma.deal.aggregate({
      where: { organizationId: orgId, status: 'OPEN' },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidDate: { gte: startOfMonth } },
      _sum: { total: true },
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
    prisma.activity.findMany({
      where: { organizationId: orgId },
      orderBy: { occurredAt: 'desc' },
      take: 6,
      include: { user: true, contact: true, deal: true },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: now },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { assignee: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, status: 'OPEN' },
      orderBy: { amount: 'desc' },
      take: 5,
      include: { stage: true, owner: true },
    }),
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "paidDate"), 'YYYY-MM') as month,
             COALESCE(SUM(total), 0)::float as total
      FROM "Invoice"
      WHERE "organizationId" = ${orgId} AND status = 'PAID' AND "paidDate" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "paidDate")
      ORDER BY month ASC
    `.catch(() => []),
    prisma.stage.findMany({
      include: {
        deals: { where: { organizationId: orgId, status: 'OPEN' }, select: { amount: true } },
        pipeline: true,
      },
      where: { pipeline: { organizationId: orgId, isDefault: true } },
      orderBy: { order: 'asc' },
    }),
  ]);

  const kpis = [
    {
      label: t('kpi.totalContacts'),
      value: totalContacts.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: t('kpi.newLeads'),
      value: newLeads.toLocaleString(),
      icon: UserPlus,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      label: t('kpi.openDeals'),
      value: openDeals.toLocaleString(),
      icon: Briefcase,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label: t('kpi.pipelineValue'),
      value: formatCurrency(Number(pipelineValue._sum.amount ?? 0)),
      icon: TrendingUp,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t('kpi.monthlyRevenue'),
      value: formatCurrency(Number(monthlyRevenue._sum.total ?? 0)),
      icon: DollarSign,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      label: t('kpi.openTickets'),
      value: openTickets.toLocaleString(),
      icon: Headphones,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
      label: t('kpi.tasksToday'),
      value: tasksToday.toLocaleString(),
      icon: CheckSquare,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: t('kpi.campaignsActive'),
      value: activeCampaigns.toLocaleString(),
      icon: Mail,
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
  ];

  const pipelineChartData = pipelineByStage.map((s) => ({
    name: s.name,
    value: s.deals.reduce((sum, d) => sum + Number(d.amount), 0),
    count: s.deals.length,
    color: s.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('welcome', { name: session.user.name })} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
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
            <CardTitle>{t('salesChart')}</CardTitle>
            <CardDescription>Ingresos cobrados últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesByMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('pipelineChart')}</CardTitle>
            <CardDescription>Valor por etapa del pipeline principal</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipelineChartData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('topDeals')}</CardTitle>
            <CardDescription>Oportunidades con mayor valor</CardDescription>
          </CardHeader>
          <CardContent>
            {topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin oportunidades abiertas</p>
            ) : (
              <ul className="space-y-3">
                {topDeals.map((deal) => (
                  <li key={deal.id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent transition">
                    <div className="flex-1 min-w-0">
                      <Link href={`/pipeline?deal=${deal.id}`} className="font-medium hover:underline truncate block">
                        {deal.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" style={{ borderColor: deal.stage.color, color: deal.stage.color }}>
                          {deal.stage.name}
                        </Badge>
                        {deal.owner && <span className="text-xs text-muted-foreground">{deal.owner.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(Number(deal.amount), deal.currency)}</p>
                      <p className="text-xs text-muted-foreground">{deal.probability}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('upcomingTasks')}</CardTitle>
            <CardDescription>Próximas a vencer</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin tareas próximas</p>
            ) : (
              <ul className="space-y-3">
                {upcomingTasks.map((task) => (
                  <li key={task.id} className="p-3 rounded-lg hover:bg-accent transition">
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {task.dueDate && formatDate(task.dueDate)}
                      </span>
                      <Badge
                        variant={
                          task.priority === 'URGENT' || task.priority === 'HIGH' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
          ) : (
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      <span className="text-muted-foreground">— {activity.subject}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(activity.occurredAt)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs h-6">
                    {activity.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
