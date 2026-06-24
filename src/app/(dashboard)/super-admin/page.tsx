import { requireAuth } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Building2, DollarSign, Users, Webhook, Zap } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const PLAN_MRR: Record<string, number> = {
  FREE: 0,
  STARTER: 29,
  PRO: 99,
  BUSINESS: 299,
};

export default async function SuperAdminPage() {
  const session = await requireAuth();
  // Sólo super-admins (campo en DB) o el primer OWNER por defecto
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { superAdmin: true },
  });
  if (!user.superAdmin) redirect('/dashboard');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    orgsTotal, orgsRecent, usersTotal, salesTotal, salesMonth,
    subsByPlan, webhookFailedRecent, orgsTop,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { active: true } }),
    prisma.sale.count(),
    prisma.sale.aggregate({
      where: { status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
    }).catch(() => [] as any[]),
    prisma.webhookDelivery.count({
      where: { status: 'FAILED', createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.organization.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, sales: true, brands: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
  ]);

  // MRR estimado
  const mrr = subsByPlan.reduce((sum: number, row: any) => sum + (PLAN_MRR[row.plan] ?? 0) * row._count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Super-admin · Salud SaaS" description="Métricas del producto completo">
        <Badge variant="default">Restringido</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organizaciones</p>
                <p className="text-2xl font-bold">{orgsTotal}</p>
                <p className="text-xs text-green-600">+{orgsRecent} esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Usuarios activos</p>
                <p className="text-2xl font-bold">{usersTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MRR estimado</p>
                <p className="text-2xl font-bold">{formatCurrency(mrr, 'EUR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas este mes</p>
                <p className="text-2xl font-bold">{salesMonth._count}</p>
                <p className="text-xs text-muted-foreground">de {salesTotal} totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suscripciones por plan</CardTitle>
          </CardHeader>
          <CardContent>
            {subsByPlan.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin suscripciones aún.</p>
            ) : (
              <ul className="space-y-2">
                {subsByPlan.map((row: any) => (
                  <li key={row.plan} className="flex items-center justify-between text-sm">
                    <Badge variant="outline">{row.plan}</Badge>
                    <span className="font-medium">{row._count} orgs · {formatCurrency((PLAN_MRR[row.plan] ?? 0) * row._count, 'EUR')}/mes</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Webhooks fallidos
            </CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6">
            <p className="text-4xl font-bold">{webhookFailedRecent}</p>
            <p className="text-xs text-muted-foreground mt-1">deliveries fallidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Facturación mes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold">{formatCurrency(Number(salesMonth._sum.total ?? 0), 'EUR')}</p>
            <p className="text-xs text-muted-foreground mt-1">en ventas firmadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas organizaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Marcas</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead>Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgsTop.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell><Badge variant="outline">{o.subscription?.plan ?? 'FREE'}</Badge></TableCell>
                  <TableCell>{o.subscription?.status ? <Badge>{o.subscription.status}</Badge> : '—'}</TableCell>
                  <TableCell className="text-right">{o._count.users}</TableCell>
                  <TableCell className="text-right">{o._count.brands}</TableCell>
                  <TableCell className="text-right">{o._count.sales}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
