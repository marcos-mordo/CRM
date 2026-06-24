import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { TasksViewSwitcher } from '@/components/tasks/tasks-view-switcher';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { getTranslations } from 'next-intl/server';

export default async function TasksPage() {
  const session = await requireAuth();
  const t = await getTranslations('Tasks');

  const [tasks, users, contacts, deals] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: session.user.organizationId },
      include: { assignee: true, contact: true, deal: true },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.contact.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { firstName: 'asc' },
    }),
    prisma.deal.findMany({
      where: { organizationId: session.user.organizationId, status: 'OPEN' },
      orderBy: { title: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${tasks.length} tareas`}>
        <TaskDialog users={users} contacts={contacts} deals={deals} />
      </PageHeader>

      <Card className="p-3">
        <TasksViewSwitcher tasks={tasks} users={users} contacts={contacts} deals={deals} />
      </Card>
    </div>
  );
}
