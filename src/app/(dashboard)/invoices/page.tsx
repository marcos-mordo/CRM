import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { InvoicesTable } from '@/components/invoices/invoices-table';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import { getTranslations } from 'next-intl/server';

export default async function InvoicesPage() {
  const session = await requireAuth();
  const t = await getTranslations('Invoices');

  const [invoices, products] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${invoices.length} facturas`}>
        <InvoiceDialog products={products} />
      </PageHeader>

      <Card>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title={t('new')} action={<InvoiceDialog products={products} />} />
        ) : (
          <InvoicesTable invoices={invoices} />
        )}
      </Card>
    </div>
  );
}
