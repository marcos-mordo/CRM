import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

/**
 * Deal forecast pesado por probability.
 * - Bruto: suma total de deals OPEN
 * - Weighted: suma de (amount × probability/100)
 * - Best case: solo deals con probability >= 70%
 * - Commit: solo deals con probability >= 90%
 */
export async function DealForecast({ organizationId }: { organizationId: string }) {
  const openDeals = await prisma.deal.findMany({
    where: { organizationId, status: 'OPEN' },
    select: { amount: true, probability: true, expectedCloseDate: true, currency: true },
  });

  let bruto = 0, weighted = 0, best = 0, commit = 0;
  const now = new Date();
  const q1End = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

  let thisQuarter = 0;
  let overdue = 0;

  for (const d of openDeals) {
    const amt = Number(d.amount);
    const p = d.probability / 100;
    bruto += amt;
    weighted += amt * p;
    if (d.probability >= 70) best += amt;
    if (d.probability >= 90) commit += amt;
    if (d.expectedCloseDate) {
      if (d.expectedCloseDate <= q1End) thisQuarter += amt * p;
      if (d.expectedCloseDate < now) overdue++;
    }
  }

  const currency = openDeals[0]?.currency ?? 'EUR';

  const rows = [
    { label: 'Bruto (pipeline)',   value: bruto,    color: 'text-slate-500' },
    { label: 'Weighted forecast',  value: weighted, color: 'text-blue-500', hint: 'amount × probabilidad' },
    { label: 'Best case (≥70%)',   value: best,     color: 'text-emerald-500' },
    { label: 'Commit (≥90%)',      value: commit,   color: 'text-purple-500' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Forecast de ventas
        </CardTitle>
        <div className="text-xs text-muted-foreground">{openDeals.length} deals abiertos</div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <div>
              <p className={r.color}>{r.label}</p>
              {r.hint && <p className="text-[10px] text-muted-foreground">{r.hint}</p>}
            </div>
            <p className="font-bold text-base">{formatCurrency(r.value, currency)}</p>
          </div>
        ))}

        <div className="border-t pt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Este trimestre (weighted)
          </span>
          <span className="font-medium">{formatCurrency(thisQuarter, currency)}</span>
        </div>

        {overdue > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded p-2">
            <AlertCircle className="h-3 w-3" />
            <span><strong>{overdue}</strong> deals vencidos requieren atención</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
