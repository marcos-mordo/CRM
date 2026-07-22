import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExportButton } from '@/components/export-button';
import { Headphones } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { TicketDialog } from '@/components/tickets/ticket-dialog';
import { SlaSettingsButton } from '@/components/tickets/sla-settings';
import { evaluateSla, DEFAULT_POLICIES, type SlaEvaluation } from '@/lib/sla';
import { isAdmin } from '@/lib/auth-helpers';
import { getTranslations } from 'next-intl/server';

export default async function TicketsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Tickets');

  const [tickets, contacts, users, slaPolicies] = await Promise.all([
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
    prisma.slaPolicy.findMany({
      where: { organizationId: session.user.organizationId },
    }),
  ]);

  // Mapa de políticas por prioridad + evaluación por ticket (solo abiertos)
  const policyMap = Object.fromEntries(
    slaPolicies.map((p) => [p.priority, { firstResponseMins: p.firstResponseMins, resolutionMins: p.resolutionMins }])
  );
  const slaByTicket: Record<string, SlaEvaluation> = {};
  if (slaPolicies.length > 0) {
    for (const tk of tickets) {
      if (['RESOLVED', 'CLOSED'].includes(tk.status)) continue;
      slaByTicket[tk.id] = evaluateSla(tk, policyMap);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${tickets.length} tickets`}>
        {isAdmin(session.user.role) && (
          <SlaSettingsButton
            current={DEFAULT_POLICIES.map((d) => ({
              priority: d.priority,
              firstResponseMins: policyMap[d.priority]?.firstResponseMins ?? d.firstResponseMins,
              resolutionMins: policyMap[d.priority]?.resolutionMins ?? d.resolutionMins,
            }))}
            configured={slaPolicies.length > 0}
          />
        )}
        <ExportButton entity="tickets" />
        <TicketDialog contacts={contacts} users={users} />
      </PageHeader>

      <Card>
        {tickets.length === 0 ? (
          <EmptyState icon={Headphones} title={t('new')} action={<TicketDialog contacts={contacts} users={users} />} />
        ) : (
          <TicketsTable tickets={tickets} users={users} sla={slaByTicket} />
        )}
      </Card>
    </div>
  );
}
