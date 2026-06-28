import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { GoalsManager } from '@/components/goals/goals-manager';
import { formatCurrency } from '@/lib/utils';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function computeProgress(orgId: string, period: string) {
  const [yyyy, mm] = period.split('-').map(Number);
  const start = new Date(yyyy, mm - 1, 1);
  const end = new Date(yyyy, mm, 1);
  const goals = await prisma.goal.findMany({
    where: { organizationId: orgId, period },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const enriched = await Promise.all(
    goals.map(async (g) => {
      let current = 0;
      switch (g.metric) {
        case 'sales_count': {
          current = await prisma.sale.count({
            where: { organizationId: orgId, representativeId: g.userId, status: { in: ['SIGNED', 'ACTIVE'] }, signedAt: { gte: start, lt: end } },
          });
          break;
        }
        case 'sales_amount': {
          const a = await prisma.sale.aggregate({
            where: { organizationId: orgId, representativeId: g.userId, status: { in: ['SIGNED', 'ACTIVE'] }, signedAt: { gte: start, lt: end } },
            _sum: { total: true },
          });
          current = Number(a._sum.total ?? 0);
          break;
        }
        case 'commission': {
          const a = await prisma.commission.aggregate({
            where: { organizationId: orgId, representativeId: g.userId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          });
          current = Number(a._sum.amount ?? 0);
          break;
        }
        case 'deals_won': {
          current = await prisma.deal.count({
            where: { organizationId: orgId, ownerId: g.userId, status: 'WON', updatedAt: { gte: start, lt: end } },
          });
          break;
        }
        case 'calls_made': {
          current = await prisma.activity.count({
            where: { organizationId: orgId, userId: g.userId, type: 'CALL', createdAt: { gte: start, lt: end } },
          });
          break;
        }
      }
      return { ...g, current, percentage: Number(g.target) > 0 ? (current / Number(g.target)) * 100 : 0 };
    })
  );
  return enriched.sort((a, b) => b.percentage - a.percentage);
}

export default async function GoalsPage() {
  const session = await requireAuth();
  const period = currentPeriod();
  const isAdminUser = isAdmin(session.user.role);

  const [goals, users] = await Promise.all([
    computeProgress(session.user.organizationId, period),
    isAdminUser
      ? prisma.user.findMany({
          where: { organizationId: session.user.organizationId },
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const myGoals = goals.filter((g) => g.userId === session.user.id);
  const ranking = goals.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Metas y objetivos" description={`Periodo ${period}`} />

      {myGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Mis metas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myGoals.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{metricLabel(g.metric)}</span>
                  <span className="text-muted-foreground">
                    {formatMetricValue(g.metric, g.current)} / {formatMetricValue(g.metric, Number(g.target))} ({g.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${g.percentage >= 100 ? 'bg-emerald-500' : g.percentage >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, g.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> Ranking del equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay metas configuradas para este periodo.</p>
          ) : (
            <ol className="space-y-2">
              {ranking.map((g, idx) => (
                <li key={g.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-700' :
                    idx === 1 ? 'bg-slate-300/40 text-slate-700' :
                    idx === 2 ? 'bg-amber-700/30 text-amber-800' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{g.user.name}</p>
                    <p className="text-xs text-muted-foreground">{metricLabel(g.metric)}: {formatMetricValue(g.metric, g.current)} / {formatMetricValue(g.metric, Number(g.target))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{g.percentage.toFixed(0)}%</p>
                    <TrendingUp className={`h-4 w-4 ml-auto ${g.percentage >= 70 ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {isAdminUser && (
        <GoalsManager users={users} period={period} existing={goals} />
      )}
    </div>
  );
}

function metricLabel(m: string): string {
  switch (m) {
    case 'sales_count':  return 'Ventas firmadas';
    case 'sales_amount': return 'Facturación';
    case 'commission':   return 'Comisiones';
    case 'deals_won':    return 'Deals ganados';
    case 'calls_made':   return 'Llamadas';
    default: return m;
  }
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'sales_amount' || metric === 'commission') {
    return formatCurrency(value, 'EUR');
  }
  return value.toString();
}
