import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { CheckSquare, DollarSign, Handshake, Store, Trophy, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export default async function MyDashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  const orgId = session.user.organizationId;

  const twoFactor = await prisma.userTwoFactor.findUnique({
    where: { userId },
    select: { enabled: true },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    mySalesMonth,
    mySalesTotal,
    myCommissionsPending,
    myCommissionsPaidMonth,
    myCommissionsPaidTotal,
    myAssignedBrands,
    myRecentSales,
    myPendingTasks,
    ranking,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { representativeId: userId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true, totalCommission: true },
      _count: true,
    }),
    prisma.sale.count({ where: { representativeId: userId, status: { in: ['SIGNED', 'ACTIVE'] } } }),
    prisma.commission.aggregate({
      where: { representativeId: userId, status: { in: ['PENDING', 'APPROVED'] } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { representativeId: userId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { representativeId: userId, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.repBrandAssignment.findMany({
      where: { userId, active: true },
      include: { brand: true },
    }),
    prisma.sale.findMany({
      where: { representativeId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { brand: true, endCustomer: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    prisma.commission.groupBy({
      by: ['representativeId'],
      where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  const myPosition = ranking.findIndex((r) => r.representativeId === userId) + 1;
  const myEarnedTotal = Number(ranking.find((r) => r.representativeId === userId)?._sum.amount ?? 0);
  const leaderEarned = Number(ranking[0]?._sum.amount ?? 0);
  const gapToLeader = leaderEarned - myEarnedTotal;

  const kpis = [
    {
      label: 'Mis ventas este mes',
      value: formatCurrency(Number(mySalesMonth._sum.total ?? 0)),
      sublabel: `${mySalesMonth._count} ventas`,
      icon: Handshake,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Mi comisión este mes',
      value: formatCurrency(Number(mySalesMonth._sum.totalCommission ?? 0)),
      icon: Trophy,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Pendiente cobrar',
      value: formatCurrency(Number(myCommissionsPending._sum.amount ?? 0)),
      icon: Wallet,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Cobrado este mes',
      value: formatCurrency(Number(myCommissionsPaidMonth._sum.amount ?? 0)),
      icon: DollarSign,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Hola, ${session.user.name.split(' ')[0]}`} description="Tu actividad y ganancias">
        <Button variant={twoFactor?.enabled ? 'outline' : 'default'} asChild>
          <Link href="/me/two-factor">
            <ShieldCheck className="h-4 w-4" />
            {twoFactor?.enabled ? '2FA activo' : 'Activar 2FA'}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium truncate">{k.label}</p>
                    <p className="text-lg sm:text-2xl font-bold leading-tight">{k.value}</p>
                    {k.sublabel && <p className="text-xs text-muted-foreground">{k.sublabel}</p>}
                  </div>
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${k.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mis últimas ventas</CardTitle>
            <CardDescription>{myRecentSales.length} de {mySalesTotal} totales</CardDescription>
          </CardHeader>
          <CardContent>
            {myRecentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aún no tienes ventas.</p>
            ) : (
              <ul className="space-y-3">
                {myRecentSales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-accent transition">
                    <div className="flex-1 min-w-0">
                      <Link href={`/sales-orders/${s.id}`} className="font-medium hover:underline">
                        {s.number}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.endCustomer.isCompany ? s.endCustomer.companyName : `${s.endCustomer.firstName} ${s.endCustomer.lastName}`}
                        {' · '}
                        <Badge variant="outline" className="text-xs">{s.brand.name}</Badge>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(Number(s.total), s.currency)}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        +{formatCurrency(Number(s.totalCommission), s.currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tu posición</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl font-bold shadow-lg">
                #{myPosition || '—'}
              </div>
              <p className="text-sm text-muted-foreground">
                {myPosition === 1
                  ? '¡Eres el líder!'
                  : myPosition > 0
                    ? `A ${formatCurrency(gapToLeader)} del líder`
                    : 'Sin comisiones aún'}
              </p>
              <p className="text-xs">
                Total cobrado: <strong>{formatCurrency(myEarnedTotal)}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" /> Mis marcas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myAssignedBrands.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin marcas asignadas. Pide al admin que te asigne en Settings → Reps↔Marcas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {myAssignedBrands.map((a) => (
                    <Badge key={a.brandId} variant="secondary" className="text-xs">{a.brand.name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Mis tareas pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myPendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tienes tareas pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {myPendingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-accent">
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    {t.dueDate && (
                      <p className="text-xs text-muted-foreground">Vence {formatDate(t.dueDate)}</p>
                    )}
                  </div>
                  <Badge variant="outline">{t.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
