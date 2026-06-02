'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TaskDialog } from './task-dialog';
import { AlertTriangle, CheckCircle2, Circle, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { deleteTask, toggleTaskStatus } from '@/app/(dashboard)/tasks/actions';
import type { Contact, Deal, Task, TaskPriority, User } from '@prisma/client';

type Row = Task & { assignee: User | null; contact: Contact | null; deal: Deal | null };

const priorityColor: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function TasksList({
  tasks,
  users,
  contacts,
  deals,
}: {
  tasks: Row[];
  users: User[];
  contacts: Contact[];
  deals: Deal[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>('all');
  const [editing, setEditing] = useState<Task | null>(null);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === 'completed') return task.status === 'COMPLETED';
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
      if (filter === 'overdue') return task.dueDate && new Date(task.dueDate) < startOfDay;
      if (filter === 'today') return task.dueDate && new Date(task.dueDate) >= startOfDay && new Date(task.dueDate) < endOfDay;
      if (filter === 'upcoming') return task.dueDate && new Date(task.dueDate) >= endOfDay;
      return true;
    });
  }, [tasks, filter]);

  const toggle = (id: string) => {
    startTransition(async () => {
      await toggleTaskStatus(id);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteTask(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <>
      <div className="p-4 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">{t('Common.all')}</TabsTrigger>
            <TabsTrigger value="overdue">{t('Tasks.overdue')}</TabsTrigger>
            <TabsTrigger value="today">{t('Tasks.today')}</TabsTrigger>
            <TabsTrigger value="upcoming">{t('Tasks.upcoming')}</TabsTrigger>
            <TabsTrigger value="completed">{t('Tasks.completed')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ul className="divide-y">
        {filtered.length === 0 ? (
          <li className="py-12 text-center text-sm text-muted-foreground">{t('Common.noData')}</li>
        ) : (
          filtered.map((task) => {
            const overdue = task.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < startOfDay;
            return (
              <li key={task.id} className="flex items-start gap-3 p-4 hover:bg-accent/50 transition group">
                <button onClick={() => toggle(task.id)} className="mt-0.5 shrink-0">
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  )}
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditing(task)}>
                  <p className={cn('font-medium', task.status === 'COMPLETED' && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className={cn('border-transparent text-xs', priorityColor[task.priority])}>
                      {t(`Tasks.priorities.${task.priority}` as any)}
                    </Badge>
                    {task.dueDate && (
                      <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        {overdue && <AlertTriangle className="h-3 w-3" />}
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.assignee && <span className="text-xs text-muted-foreground">{task.assignee.name}</span>}
                    {task.contact && (
                      <Badge variant="outline" className="text-xs">
                        {task.contact.firstName} {task.contact.lastName}
                      </Badge>
                    )}
                    {task.deal && <Badge variant="outline" className="text-xs">{task.deal.title}</Badge>}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(task)}>
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(task.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })
        )}
      </ul>

      {editing && (
        <TaskDialog
          task={editing}
          users={users}
          contacts={contacts}
          deals={deals}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
