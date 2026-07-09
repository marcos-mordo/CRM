import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SlaEvaluation } from '@/lib/sla';

function fmtLeft(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const t = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return mins < 0 ? `vencido hace ${t}` : `quedan ${t}`;
}

export function SlaBadge({ sla }: { sla: SlaEvaluation }) {
  // Prioridad de display: breached > at_risk > ok/met
  const worst =
    sla.firstResponse === 'breached' || sla.resolution === 'breached' ? 'breached'
    : sla.firstResponse === 'at_risk' || sla.resolution === 'at_risk' ? 'at_risk'
    : sla.firstResponse === 'none' ? 'none'
    : 'ok';

  if (worst === 'none') return null;

  if (worst === 'breached') {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" />
        SLA {sla.minutesLeft !== null ? fmtLeft(sla.minutesLeft) : 'incumplido'}
      </Badge>
    );
  }
  if (worst === 'at_risk') {
    return (
      <Badge className="gap-1 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" variant="outline">
        <Clock className="h-3 w-3" />
        SLA {sla.minutesLeft !== null ? fmtLeft(sla.minutesLeft) : 'en riesgo'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
      <CheckCircle2 className="h-3 w-3" />
      SLA ok
    </Badge>
  );
}
