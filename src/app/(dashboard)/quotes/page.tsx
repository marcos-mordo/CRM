import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExportButton } from '@/components/export-button';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { QuotesTable } from '@/components/quotes/quotes-table';
import { QuoteDialog } from '@/components/quotes/quote-dialog';
import { getTranslations } from 'next-intl/server';

export default async function QuotesPage() {
  const session = await requireAuth();
  const t = await getTranslations('Quotes');

  const [quotes, products] = await Promise.all([
    prisma.quote.findMany({
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
      <PageHeader title={t('title')} description={`${quotes.length} cotizaciones`}>
        <ExportButton entity="quotes" />
        <QuoteDialog products={products} />
      </PageHeader>

      <Card>
        {quotes.length === 0 ? (
          <EmptyState icon={FileText} title={t('new')} action={<QuoteDialog products={products} />} />
        ) : (
          <QuotesTable quotes={quotes} />
        )}
      </Card>
    </div>
  );
}
