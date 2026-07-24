import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExportButton } from '@/components/export-button';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { CompaniesTable } from '@/components/companies/companies-table';
import { getCustomFieldTableData } from '@/lib/custom-field-table';
import { CompanyDialog } from '@/components/companies/company-dialog';
import { getTranslations } from 'next-intl/server';

export default async function CompaniesPage() {
  const session = await requireAuth();
  const t = await getTranslations('Companies');

  const [companies, customFields] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId: session.user.organizationId },
      include: { _count: { select: { contacts: true, deals: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    getCustomFieldTableData(session.user.organizationId, 'COMPANY'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${companies.length} empresas`}>
        <ExportButton entity="companies" />
        <CompanyDialog />
      </PageHeader>

      <Card>
        {companies.length === 0 ? (
          <EmptyState icon={Building2} title={t('new')} action={<CompanyDialog />} />
        ) : (
          <CompaniesTable companies={companies} customFields={customFields} />
        )}
      </Card>
    </div>
  );
}
