import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface YoyMetric {
  label: string;
  current: number;
  previous: number;
  format?: 'currency' | 'number';
  inverted?: boolean; // true = bajada es buena (ej: tickets abiertos)
}

interface Props {
  title?: string;
  description?: string;
  metrics: YoyMetric[];
}

function formatValue(v: number, format: 'currency' | 'number' = 'number') {
  if (format === 'currency') return formatCurrency(v);
  return v.toLocaleString('es-ES');
}

function delta(current: number, previous: number): { pct: number; sign: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, sign: 'flat' };
    return { pct: 100, sign: 'up' };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, sign: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' };
}

export function YoyComparison({ title = 'Comparativa interanual', description = 'Mismo periodo del año pasado', metrics }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const d = delta(m.current, m.previous);
            const isPositive = m.inverted ? d.sign === 'down' : d.sign === 'up';
            const isNegative = m.inverted ? d.sign === 'up' : d.sign === 'down';
            const Icon = d.sign === 'up' ? ArrowUp : d.sign === 'down' ? ArrowDown : ArrowRight;
            return (
              <div key={m.label} className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold mt-1">{formatValue(m.current, m.format)}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs">
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 font-semibold',
                      isPositive && 'text-green-600 dark:text-green-400',
                      isNegative && 'text-red-600 dark:text-red-400',
                      d.sign === 'flat' && 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {Math.abs(d.pct).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">
                    vs {formatValue(m.previous, m.format)} año pasado
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
