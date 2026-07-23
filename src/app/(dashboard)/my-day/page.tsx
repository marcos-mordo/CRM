import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MyDayTasks } from '@/components/my-day/my-day-tasks';
import { rotStateFor } from '@/lib/sales-intel';
import { formatCurrency } from '@/lib/utils';
import { CheckSquare, AlertTriangle, TrendingDown, Bell, Flame } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MyDayPage() {
  const session = await requireAuth();
  const uid = session.user.id;
  const orgId = session.user.organizationId;
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [org, dueTasks, myOpenDeals, notifications, activityToday] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { rottingDays: true, currency: true } }),
    prisma.task.findMany({
      where: { organizationId: orgId, assigneeId: uid, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { not: null, lte: endOfToday } },
      orderBy: { dueDate: 'asc' },
      take: 25,
      include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { title: true } } },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, ownerId: uid, status: 'OPEN' },
      orderBy: { lastActivityAt: 'asc' },
      take: 40,
      include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
    }),
    prisma.notification.findMany({
      where: { organizationId: orgId, userId: uid, read: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.activity.count({ where: { organizationId: orgId, userId: uid, occurredAt: { gte: startOfToday } } }),
  ]);

  const rottingDays = org?.rottingDays ?? 14;
  const currency = org?.currency ?? 'EUR';

  const tasks = dueTasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate?.toISOString() ?? null,
    priority: t.priority,
    overdue: t.dueDate ? t.dueDate < startOfToday : false,
    link: t.contactId ? `/contacts/${t.contactId}` : '/tasks',
    subtitle: t.deal?.title || (t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : undefined),
  }));
  const overdueCount = tasks.filter((t) => t.overdue).length;

  // Deals en riesgo (warm/rotting), ordenados por más días sin tocar
  const atRisk = myOpenDeals
    .map((d) => ({ deal: d, rot: rotStateFor(d.lastActivityAt, rottingDays, now) }))
    .filter((x) => x.rot.state !== 'fresh')
    .sort((a, b) => b.rot.daysIdle - a.rot.daysIdle)
    .slice(0, 8);

  const kpis = [
    { label: 'Para hoy', value: tasks.length, icon: CheckSquare, color: 'text-blue-500' },
    { label: 'Vencidas', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground' },
    { label: 'Deals en riesgo', value: atRisk.length, icon: TrendingDown, color: atRisk.length > 0 ? 'text-amber-500' : 'text-muted-foreground' },
    { label: 'Actividad hoy', value: activityToday, icon: Flame, color: 'text-emerald-500' },
  ];

  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi día"
        description={`${greeting}${session.user.name ? ', ' + session.user.name.split(' ')[0] : ''} · ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tareas de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Para hoy</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MyDayTasks tasks={tasks} />
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Sin leer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin notificaciones nuevas.</p>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => (
                  <li key={n.id} className="py-2">
                    <Link href={n.link || '/notifications'} className="block hover:opacity-80">
                      <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Oportunidades en riesgo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Oportunidades que necesitan atención</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Ninguna oportunidad se está enfriando. Buen trabajo 👏</p>
          ) : (
            <ul className="divide-y">
              {atRisk.map(({ deal, rot }) => (
                <li key={deal.id} className="flex items-center gap-3 py-2.5">
                  <span className={`text-lg ${rot.state === 'rotting' ? '' : 'opacity-70'}`}>{rot.state === 'rotting' ? '🥀' : '⏳'}</span>
                  <div className="flex-1 min-w-0">
                    <Link href="/pipeline" className="text-sm font-medium hover:underline">{deal.title}</Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {deal.company?.name || (deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : '—')}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(Number(deal.amount), deal.currency)}</span>
                  <span className={`text-xs shrink-0 w-24 text-right ${rot.state === 'rotting' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {rot.daysIdle}d sin tocar
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
