'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckSquare, Handshake, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type EventType = 'task' | 'sale' | 'deal';

interface Event {
  id: string;
  type: EventType;
  title: string;
  date: Date | string;
  meta?: string;
  href: string;
  priority?: string;
  status?: string;
}

interface Props {
  events: Event[];
  year: number;
  month: number;
}

const TYPE_STYLES: Record<EventType, { dot: string; bg: string; icon: any }> = {
  task: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900', icon: CheckSquare },
  sale: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900', icon: Handshake },
  deal: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900', icon: Target },
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarView({ events, year, month }: Props) {
  const router = useRouter();
  const today = new Date();
  const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  // Construir matriz del mes
  const firstDay = new Date(year, month, 1);
  // En JS getDay() es 0=Sun ... 6=Sat. Convertimos a lunes=0
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // Agrupar eventos por día
  const byDay = new Map<string, Event[]>();
  for (const ev of events) {
    const d = typeof ev.date === 'string' ? new Date(ev.date) : ev.date;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const list = byDay.get(key) ?? [];
    list.push(ev);
    byDay.set(key, list);
  }

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    router.push(`/calendar?year=${y}&month=${m}`);
  };

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/calendar?year=${today.getFullYear()}&month=${today.getMonth()}`)}>Hoy</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => goMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => goMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-xs text-muted-foreground text-center font-medium">
        {DAY_NAMES.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="min-h-[100px] border-r border-b last:border-r-0 bg-muted/20" />;
          const key = `${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`;
          const dayEvents = byDay.get(key) ?? [];
          const todayCell = isToday(cell);
          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] border-r border-b last:border-r-0 p-1.5 relative flex flex-col gap-1',
                todayCell && 'bg-primary/5'
              )}
            >
              <div className={cn('text-xs font-medium self-end', todayCell && 'text-primary font-bold')}>
                {cell.getDate()}
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const s = TYPE_STYLES[ev.type];
                  return (
                    <Link
                      key={ev.id}
                      href={ev.href}
                      className={cn('block text-[10px] px-1.5 py-0.5 rounded border truncate hover:opacity-80', s.bg)}
                      title={`${ev.title} — ${ev.meta ?? ''}`}
                    >
                      <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle', s.dot)} />
                      {ev.title}
                    </Link>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Tareas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ventas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Oportunidades</span>
      </div>
    </>
  );
}
