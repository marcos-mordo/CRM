'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, StickyNote, Handshake, Phone, Mail, Activity as ActivityIcon, CalendarClock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Item = {
  kind: 'task' | 'note' | 'deal' | 'activity' | 'email';
  at: Date;
  title: string;
  detail?: string;
  by?: string;
  meta?: string;
};

export function ContactTimeline({
  tasks, notes, deals, activities, emails = [],
}: {
  contactId: string;
  tasks: any[];
  notes: any[];
  deals: any[];
  activities: any[];
  emails?: any[];
}) {
  const [filter, setFilter] = useState<'all' | 'task' | 'note' | 'deal' | 'activity' | 'email'>('all');

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const t of tasks) {
      out.push({
        kind: 'task',
        at: t.createdAt,
        title: t.title,
        detail: t.description ?? undefined,
        by: t.assignee?.name ?? undefined,
        meta: t.status + (t.dueDate ? ` · vence ${formatDate(t.dueDate)}` : ''),
      });
    }
    for (const n of notes) {
      out.push({ kind: 'note', at: n.createdAt, title: n.content.slice(0, 80), detail: n.content.length > 80 ? n.content : undefined, by: n.author?.name });
    }
    for (const d of deals) {
      out.push({
        kind: 'deal',
        at: d.updatedAt,
        title: d.title,
        meta: `${d.stage?.name ?? '—'} · ${Number(d.amount ?? 0).toLocaleString('es-ES', { style: 'currency', currency: d.currency ?? 'EUR' })}`,
        by: d.owner?.name,
      });
    }
    for (const a of activities) {
      out.push({
        kind: 'activity',
        at: a.createdAt,
        title: a.subject ?? a.type,
        detail: a.description ?? undefined,
        by: a.user?.name,
        meta: a.type,
      });
    }
    for (const e of emails) {
      out.push({
        kind: 'email',
        at: e.sentAt,
        title: e.subject,
        detail: e.snippet ?? undefined,
        by: e.direction === 'OUT' ? `→ ${e.toAddr}` : `← ${e.fromAddr}`,
        meta: e.direction === 'OUT' ? 'enviado' : 'recibido',
      });
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [tasks, notes, deals, activities, emails]);

  const filtered = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  const iconFor = (k: Item['kind']) => {
    switch (k) {
      case 'task': return CheckSquare;
      case 'note': return StickyNote;
      case 'deal': return Handshake;
      case 'activity': return ActivityIcon;
      case 'email': return Mail;
    }
  };

  const colorFor = (k: Item['kind']) => {
    switch (k) {
      case 'task': return 'text-blue-500 bg-blue-500/10';
      case 'note': return 'text-amber-500 bg-amber-500/10';
      case 'deal': return 'text-emerald-500 bg-emerald-500/10';
      case 'activity': return 'text-purple-500 bg-purple-500/10';
      case 'email': return 'text-cyan-500 bg-cyan-500/10';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">Todo <Badge variant="secondary" className="ml-2">{items.length}</Badge></TabsTrigger>
            <TabsTrigger value="task">Tareas <Badge variant="secondary" className="ml-2">{tasks.length}</Badge></TabsTrigger>
            <TabsTrigger value="note">Notas <Badge variant="secondary" className="ml-2">{notes.length}</Badge></TabsTrigger>
            <TabsTrigger value="deal">Deals <Badge variant="secondary" className="ml-2">{deals.length}</Badge></TabsTrigger>
            <TabsTrigger value="activity">Actividad <Badge variant="secondary" className="ml-2">{activities.length}</Badge></TabsTrigger>
            <TabsTrigger value="email">Emails <Badge variant="secondary" className="ml-2">{emails.length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin actividad aún</p>
        ) : (
          <ol className="relative border-l ml-2 space-y-4 py-2">
            {filtered.map((it, idx) => {
              const Icon = iconFor(it.kind);
              const cls = colorFor(it.kind);
              return (
                <li key={idx} className="ml-6 relative">
                  <span className={`absolute -left-[35px] top-0 h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-background ${cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm">{it.title}</p>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(it.at)}
                      </span>
                    </div>
                    {it.detail && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{it.detail}</p>}
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                      {it.by && <span>{it.by}</span>}
                      {it.meta && <Badge variant="outline" className="text-[10px]">{it.meta}</Badge>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
