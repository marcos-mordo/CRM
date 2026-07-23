'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { toggleTaskStatus } from '@/app/(dashboard)/tasks/actions';

interface TaskRow {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  overdue: boolean;
  link: string;
  subtitle?: string;
}

export function MyDayTasks({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set());

  const complete = (id: string) => {
    setDone((s) => new Set(s).add(id)); // feedback óptimista
    startTransition(async () => {
      try {
        await toggleTaskStatus(id);
        toast.success('Tarea completada');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
        setDone((s) => { const n = new Set(s); n.delete(id); return n; });
      }
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
        <p className="text-sm">Todo al día. Sin tareas pendientes para hoy 🎉</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {tasks.map((t) => {
        const isDone = done.has(t.id);
        return (
          <li key={t.id} className={`flex items-center gap-3 py-2.5 ${isDone ? 'opacity-40' : ''}`}>
            <button onClick={() => complete(t.id)} disabled={pending || isDone} className="shrink-0 text-muted-foreground hover:text-emerald-600 transition">
              {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <Link href={t.link} className={`text-sm font-medium hover:underline ${isDone ? 'line-through' : ''}`}>{t.title}</Link>
              {t.subtitle && <p className="text-xs text-muted-foreground truncate">{t.subtitle}</p>}
            </div>
            {t.overdue ? (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" /> Vencida
              </span>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">Hoy</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
