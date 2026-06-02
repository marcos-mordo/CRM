import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { CompaniesTable } from '@/components/companies/companies-table';
import { CompanyDialog } from '@/components/companies/company-dialog';
import { getTranslations } from 'next-intl/server';

export default async function CompaniesPage() {
  const session = await requireAuth();
  const t = await getTranslations('Companies');

  const companies = await prisma.company.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { contacts: true, deals: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${companies.length} empresas`}>
        <CompanyDialog />
      </PageHeader>

      <Card>
        {companies.length === 0 ? (
          <EmptyState icon={Building2} title={t('new')} action={<CompanyDialog />} />
        ) : (
          <CompaniesTable companies={companies} />
        )}
      </Card>
    </div>
  );
}
