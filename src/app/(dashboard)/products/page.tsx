import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExportButton } from '@/components/export-button';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { ProductsTable } from '@/components/products/products-table';
import { ProductDialog } from '@/components/products/product-dialog';
import { getTranslations } from 'next-intl/server';

export default async function ProductsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Products');

  const products = await prisma.product.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${products.length} productos`}>
        <ExportButton entity="products" />
        <ProductDialog />
      </PageHeader>

      <Card>
        {products.length === 0 ? (
          <EmptyState icon={Package} title={t('new')} action={<ProductDialog />} />
        ) : (
          <ProductsTable products={products} />
        )}
      </Card>
    </div>
  );
}
