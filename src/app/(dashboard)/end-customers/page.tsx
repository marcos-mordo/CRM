import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { UserCheck } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { EndCustomersTable } from '@/components/end-customers/end-customers-table';
import { EndCustomerDialog } from '@/components/end-customers/end-customer-dialog';
import { getTranslations } from 'next-intl/server';

export default async function EndCustomersPage() {
  const session = await requireAuth();
  const t = await getTranslations('EndCustomers');

  const customers = await prisma.endCustomer.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { sales: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${customers.length} clientes`}>
        <EndCustomerDialog />
      </PageHeader>

      <Card>
        {customers.length === 0 ? (
          <EmptyState icon={UserCheck} title={t('noCustomers')} action={<EndCustomerDialog />} />
        ) : (
          <EndCustomersTable customers={customers} />
        )}
      </Card>
    </div>
  );
}
