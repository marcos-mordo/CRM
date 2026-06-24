'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskDialog } from './task-dialog';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { updateTask } from '@/app/(dashboard)/tasks/actions';
import type { Contact, Deal, Task, TaskPriority, TaskStatus, User } from '@prisma/client';

type Row = Task & { assignee: User | null; contact: Contact | null; deal: Deal | null };

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'PENDING', label: 'Pendientes', color: '#94a3b8' },
  { key: 'IN_PROGRESS', label: 'En progreso', color: '#3b82f6' },
  { key: 'COMPLETED', label: 'Completadas', color: '#10b981' },
  { key: 'CANCELLED', label: 'Canceladas', color: '#ef4444' },
];

const priorityColor: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export function TasksKanban({
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
  const router = useRouter();
  const [editing, setEditing] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('taskId');
    if (!id) return;
    startTransition(async () => {
      try {
        await updateTask(id, { status });
        toast.success(`Movida a "${COLUMNS.find((c) => c.key === status)?.label}"`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-thin">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={cn(
                'flex-shrink-0 w-72 rounded-lg p-2 transition',
                dragOver === col.key ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.key);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="flex items-center gap-2 px-2 py-2 mb-2">
                <div className="h-3 w-3 rounded-full" style={{ background: col.color }} />
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="h-5">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colTasks.map((task) => {
                  const overdue = task.dueDate && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && new Date(task.dueDate) < today;
                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setEditing(task)}
                      className="p-3 cursor-pointer hover:shadow-md transition border-l-4"
                      style={{ borderLeftColor: col.color }}
                    >
                      <p className={cn(
                        'font-medium text-sm',
                        (task.status === 'COMPLETED' || task.status === 'CANCELLED') && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge className={cn('border-transparent text-[10px]', priorityColor[task.priority])}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className={cn(
                            'text-[10px] flex items-center gap-0.5',
                            overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                          )}>
                            {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t">
                          → {task.assignee.name}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
