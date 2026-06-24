import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, CheckCircle, FileSignature, Handshake, ShieldOff, Trophy, User as UserIcon, UserPlus, Wallet } from 'lucide-react';
import { formatDateTime, initials } from '@/lib/utils';

const ACTION_META: Record<string, { icon: any; color: string; verb: string }> = {
  SALE_CREATED: { icon: Handshake, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300', verb: 'creó la venta' },
  SALE_SIGNED: { icon: FileSignature, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300', verb: 'firmó la venta' },
  SALE_CANCELLED: { icon: ShieldOff, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300', verb: 'canceló la venta' },
  SALE_REFUNDED: { icon: ShieldOff, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300', verb: 'reembolsó la venta' },
  COMMISSION_APPROVED: { icon: CheckCircle, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300', verb: 'aprobó comisión' },
  COMMISSION_PAID: { icon: Wallet, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300', verb: 'pagó comisión' },
  USER_LOGIN: { icon: UserIcon, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300', verb: 'inició sesión' },
  USER_INVITED: { icon: UserPlus, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300', verb: 'invitó a' },
  BRAND_CREATED: { icon: Trophy, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300', verb: 'creó la marca' },
};

export async function TeamActivityFeed({ organizationId }: { organizationId: string }) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      action: { in: ['SALE_CREATED', 'SALE_SIGNED', 'SALE_CANCELLED', 'SALE_REFUNDED', 'COMMISSION_APPROVED', 'COMMISSION_PAID', 'USER_INVITED', 'BRAND_CREATED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Actividad del equipo
        </CardTitle>
        <CardDescription>Últimas 10 acciones de tus compañeros</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin actividad reciente del equipo.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => {
              const meta = ACTION_META[log.action] ?? { icon: Activity, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800', verb: log.action.toLowerCase() };
              const Icon = meta.icon;
              const md = (log.metadata as any) ?? {};
              const detail =
                log.action.startsWith('SALE_') ? md.number
                : log.action.startsWith('COMMISSION_') ? `${md.amount?.toFixed?.(2) ?? md.amount}€`
                : log.entityId?.slice(0, 8);
              return (
                <li key={log.id} className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full ${meta.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{log.actorName ?? 'Sistema'}</span>{' '}
                      <span className="text-muted-foreground">{meta.verb}</span>{' '}
                      {detail && <Badge variant="outline" className="text-xs font-mono">{detail}</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
