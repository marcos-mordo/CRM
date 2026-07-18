import { requireAuth } from '@/lib/auth-helpers';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { winLossAnalytics } from '@/lib/sales-intel';
import { Trophy, XCircle, Percent, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default async function SalesAnalyticsPage() {
  const session = await requireAuth();
  const a = await winLossAnalytics(session.user.organizationId, 90);

  const kpis = [
    { label: 'Win rate', value: `${a.winRate}%`, icon: Percent, color: a.winRate >= 50 ? 'text-emerald-500' : 'text-amber-500' },
    { label: 'Ganados', value: a.won, sub: formatCurrency(a.wonValue, 'EUR'), icon: Trophy, color: 'text-emerald-500' },
    { label: 'Perdidos', value: a.lost, sub: formatCurrency(a.lostValue, 'EUR'), icon: XCircle, color: 'text-red-500' },
    { label: 'Ciclo medio', value: `${a.avgCycleDays}d`, sub: 'de creación a cierre', icon: Clock, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Análisis de ventas" description="Win rate, ciclo de venta y razones de pérdida — últimos 90 días" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <Icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-3xl font-bold mt-1">{k.value}</p>
                {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Embudo de cierre</CardTitle>
          </CardHeader>
          <CardContent>
            {a.total === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay deals cerrados en este periodo.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span>Ganados</span><span className="font-medium">{a.won}</span></div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 text-[10px] text-white font-medium"
                         style={{ width: `${a.total > 0 ? (a.won / a.total) * 100 : 0}%` }}>
                      {a.total > 0 ? Math.round((a.won / a.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span>Perdidos</span><span className="font-medium">{a.lost}</span></div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full flex items-center justify-end pr-2 text-[10px] text-white font-medium"
                         style={{ width: `${a.total > 0 ? (a.lost / a.total) * 100 : 0}%` }}>
                      {a.total > 0 ? Math.round((a.lost / a.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><XCircle className="h-4 w-4" /> Por qué perdemos</CardTitle>
          </CardHeader>
          <CardContent>
            {a.lossReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin pérdidas registradas 🎉</p>
            ) : (
              <ul className="space-y-2">
                {a.lossReasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between text-sm">
                    <span>{r.reason}</span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 rounded-full bg-red-400" style={{ width: `${Math.max(12, (r.count / a.lost) * 100)}px` }} />
                      <span className="font-medium w-6 text-right">{r.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
