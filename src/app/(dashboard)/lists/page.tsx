import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { List } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { ListsView } from '@/components/lists/lists-view';
import { ListDialog } from '@/components/lists/list-dialog';
import { getTranslations } from 'next-intl/server';

export default async function ListsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Lists');

  const [lists, contacts] = await Promise.all([
    prisma.emailList.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { members: true } },
        members: { include: { contact: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.findMany({
      where: { organizationId: session.user.organizationId, email: { not: null } },
      orderBy: { firstName: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${lists.length} listas`}>
        <ListDialog />
      </PageHeader>

      {lists.length === 0 ? (
        <Card>
          <EmptyState icon={List} title={t('new')} action={<ListDialog />} />
        </Card>
      ) : (
        <ListsView lists={lists} contacts={contacts} />
      )}
    </div>
  );
}
