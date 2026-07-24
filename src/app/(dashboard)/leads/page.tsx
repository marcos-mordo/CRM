import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExportButton } from '@/components/export-button';
import { UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { LeadsTable } from '@/components/leads/leads-table';
import { getCustomFieldTableData } from '@/lib/custom-field-table';
import { LeadDialog } from '@/components/leads/lead-dialog';
import { getTranslations } from 'next-intl/server';

export default async function LeadsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Leads');

  const [leads, users, customFields] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: session.user.organizationId },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    getCustomFieldTableData(session.user.organizationId, 'LEAD'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${leads.length} leads en cartera`}>
        <ExportButton entity="leads" />
        <LeadDialog users={users} />
      </PageHeader>

      <Card>
        {leads.length === 0 ? (
          <EmptyState icon={UserPlus} title={t('new')} action={<LeadDialog users={users} />} />
        ) : (
          <LeadsTable leads={leads} users={users} customFields={customFields} />
        )}
      </Card>
    </div>
  );
}
