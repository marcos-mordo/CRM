import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { LogActivityDialog } from '@/components/activities/log-activity-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Phone, Mail, Users, StickyNote, Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ActivityType } from '@prisma/client';

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  CALL: { label: 'Llamada', icon: Phone, color: 'text-blue-500' },
  MEETING: { label: 'Reunión', icon: Users, color: 'text-purple-500' },
  EMAIL: { label: 'Email', icon: Mail, color: 'text-cyan-500' },
  NOTE: { label: 'Nota', icon: StickyNote, color: 'text-amber-500' },
  STATUS_CHANGE: { label: 'Cambio de estado', icon: RefreshCw, color: 'text-gray-500' },
};

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'CALL', label: 'Llamadas' },
  { key: 'MEETING', label: 'Reuniones' },
  { key: 'EMAIL', label: 'Emails' },
  { key: 'NOTE', label: 'Notas' },
];

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const session = await requireAuth();
  const { type } = await searchParams;
  const typeFilter = type && type in ActivityType ? (type as ActivityType) : undefined;

  const activities = await prisma.activity.findMany({
    where: { organizationId: session.user.organizationId, ...(typeFilter ? { type: typeFilter } : {}) },
    orderBy: { occurredAt: 'desc' },
    take: 200,
    include: {
      user: { select: { name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  // Agrupa por día
  const groups = new Map<string, typeof activities>();
  for (const a of activities) {
    const key = a.occurredAt.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Actividades" description="Registro de llamadas, reuniones, emails y notas de todo el equipo">
        <LogActivityDialog trigger={undefined} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (typeFilter ?? '') === f.key;
          return (
            <Link
              key={f.key}
              href={f.key ? `/activities?type=${f.key}` : '/activities'}
              className={`px-3 py-1.5 rounded-md text-sm border transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {activities.length === 0 ? (
        <Card>
          <EmptyState
            icon={ActivityIcon}
            title="Sin actividades registradas"
            description="Registra llamadas, reuniones y notas desde aquí o desde cualquier contacto u oportunidad."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {new Date(day).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <Card>
                <CardContent className="p-0 divide-y">
                  {items.map((a) => {
                    const meta = TYPE_META[a.type] ?? TYPE_META.NOTE;
                    const Icon = meta.icon;
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3">
                        <div className={`mt-0.5 ${meta.color}`}><Icon className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{a.subject}</p>
                          {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span>{meta.label}</span>
                            <span>·</span>
                            <span>{a.user.name}</span>
                            {a.contact && (
                              <>
                                <span>·</span>
                                <Link href={`/contacts/${a.contact.id}`} className="text-primary hover:underline">
                                  {a.contact.firstName} {a.contact.lastName}
                                </Link>
                              </>
                            )}
                            {a.deal && (
                              <>
                                <span>·</span>
                                <span className="text-primary">{a.deal.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {a.occurredAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
