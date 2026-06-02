import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Headphones } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { TicketDialog } from '@/components/tickets/ticket-dialog';
import { getTranslations } from 'next-intl/server';

export default async function TicketsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Tickets');

  const [tickets, contacts, users] = await Promise.all([
    prisma.ticket.findMany({
      where: { organizationId: session.user.organizationId },
      include: { contact: true, agent: true, _count: { select: { comments: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.contact.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { firstName: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${tickets.length} tickets`}>
        <TicketDialog contacts={contacts} users={users} />
      </PageHeader>

      <Card>
        {tickets.length === 0 ? (
          <EmptyState icon={Headphones} title={t('new')} action={<TicketDialog contacts={contacts} users={users} />} />
        ) : (
          <TicketsTable tickets={tickets} users={users} />
        )}
      </Card>
    </div>
  );
}
