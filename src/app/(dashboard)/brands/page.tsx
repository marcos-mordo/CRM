import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Store } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { BrandsGrid } from '@/components/brands/brands-grid';
import { BrandDialog } from '@/components/brands/brand-dialog';
import { getTranslations } from 'next-intl/server';

export default async function BrandsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Brands');

  const brands = await prisma.brand.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      _count: { select: { products: true, sales: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${brands.length} marcas`}>
        <BrandDialog />
      </PageHeader>

      {brands.length === 0 ? (
        <Card>
          <EmptyState icon={Store} title={t('noBrands')} action={<BrandDialog />} />
        </Card>
      ) : (
        <BrandsGrid brands={brands} />
      )}
    </div>
  );
}
