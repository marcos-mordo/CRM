'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { List, LayoutGrid } from 'lucide-react';
import { TasksList } from './tasks-list';
import { TasksKanban } from './tasks-kanban';
import type { Contact, Deal, Task, User } from '@prisma/client';

type Row = Task & { assignee: User | null; contact: Contact | null; deal: Deal | null };

interface Props {
  tasks: Row[];
  users: User[];
  contacts: Contact[];
  deals: Deal[];
}

export function TasksViewSwitcher({ tasks, users, contacts, deals }: Props) {
  const [view, setView] = useState<'list' | 'kanban'>('list');

  return (
    <>
      <div className="flex items-center justify-end gap-1 mb-3">
        <Button
          size="sm"
          variant={view === 'list' ? 'default' : 'outline'}
          onClick={() => setView('list')}
        >
          <List className="h-3.5 w-3.5" /> Lista
        </Button>
        <Button
          size="sm"
          variant={view === 'kanban' ? 'default' : 'outline'}
          onClick={() => setView('kanban')}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Kanban
        </Button>
      </div>

      {view === 'list' ? (
        <TasksList tasks={tasks} users={users} contacts={contacts} deals={deals} />
      ) : (
        <TasksKanban tasks={tasks} users={users} contacts={contacts} deals={deals} />
      )}
    </>
  );
}
