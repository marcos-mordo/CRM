import { requireAuth } from '@/lib/auth-helpers';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { recurringRevenue } from '@/lib/recurring-revenue';
import { formatCurrency } from '@/lib/utils';
import { Repeat, CalendarClock, Users, Layers, Store, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const FREQ_LABEL: Record<string, string> = { MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual' };
const CUR = 'EUR';

export default async function RecurringRevenuePage() {
  const session = await requireAuth();
  const r = await recurringRevenue(session.user.organizationId);

  const maxBrandMrr = Math.max(1, ...r.byBrand.map((b) => b.mrr));
  const maxFreqMrr = Math.max(1, ...r.byFrequency.map((f) => f.mrr));

  const kpis = [
    { label: 'MRR', value: formatCurrency(r.mrr, CUR), sub: 'Ingreso mensual recurrente', icon: Repeat, color: 'text-emerald-500' },
    { label: 'ARR', value: formatCurrency(r.arr, CUR), sub: 'Proyección anual (MRR × 12)', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Contratos activos', value: r.activeContracts, sub: `${r.customers} clientes con suscripción`, icon: Layers, color: 'text-blue-500' },
    { label: 'ARPA', value: formatCurrency(r.arpa, CUR), sub: 'Ingreso medio por cliente/mes', icon: Users, color: 'text-violet-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ingresos recurrentes" description="MRR, ARR y salud de las suscripciones — normalizado a base mensual" />

      {r.mrr === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no hay ventas activas con productos de facturación periódica (mensual, trimestral o anual).
            <br />Registra una venta de un producto SaaS o de servicio gestionado para ver aquí tu MRR.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs principales */}
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
                    <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Movimiento del mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Nuevo MRR este mes</p>
                </div>
                <p className="text-2xl font-bold mt-1">+{formatCurrency(r.newMrr, CUR)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ArrowDownRight className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Churn este mes</p>
                </div>
                <p className="text-2xl font-bold mt-1">−{formatCurrency(r.churnedMrr, CUR)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Repeat className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">MRR neto del mes</p>
                </div>
                <p className={`text-2xl font-bold mt-1 ${r.netMrr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {r.netMrr >= 0 ? '+' : '−'}{formatCurrency(Math.abs(r.netMrr), CUR)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MRR por marca */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> MRR por marca</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {r.byBrand.map((b) => (
                    <div key={b.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{b.name} <span className="text-muted-foreground">· {b.count}</span></span>
                        <span className="font-medium">{formatCurrency(b.mrr, CUR)}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(b.mrr / maxBrandMrr) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Por frecuencia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Por frecuencia de facturación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {r.byFrequency.map((f) => (
                    <div key={f.freq}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{FREQ_LABEL[f.freq]} <span className="text-muted-foreground">· {f.count} contratos</span></span>
                        <span className="font-medium">{formatCurrency(f.mrr, CUR)}/mes</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(f.mrr / maxFreqMrr) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top contratos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Top contratos recurrentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="py-2 px-4 font-medium">Cliente</th>
                      <th className="py-2 px-4 font-medium">Marca</th>
                      <th className="py-2 px-4 font-medium hidden sm:table-cell">Producto</th>
                      <th className="py-2 px-4 font-medium">Frecuencia</th>
                      <th className="py-2 px-4 font-medium text-right">MRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.topContracts.map((c, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="py-2 px-4 font-medium">{c.customer}</td>
                        <td className="py-2 px-4">{c.brand}</td>
                        <td className="py-2 px-4 text-muted-foreground hidden sm:table-cell">{c.product}</td>
                        <td className="py-2 px-4"><Badge variant="secondary">{FREQ_LABEL[c.frequency]}</Badge></td>
                        <td className="py-2 px-4 text-right font-medium">{formatCurrency(c.mrr, CUR)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
