import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { CatalogView } from '@/components/catalog/catalog-view';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const session = await requireAuth();
  const t = await getTranslations();
  const { brand: brandFilter } = await searchParams;

  const [brands, products] = await Promise.all([
    prisma.brand.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.brandProduct.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(brandFilter ? { brandId: brandFilter } : {}),
      },
      include: { brand: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    }),
  ]);

  if (brands.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('Nav.brandProducts')} />
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Primero crea una marca"
            description="Necesitas al menos una marca para añadir productos a su catálogo."
            action={
              <Button asChild>
                <Link href="/brands">Ir a Marcas</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Nav.brandProducts')}
        description={`${products.length} productos en ${brands.length} marcas`}
      />
      <CatalogView brands={brands} products={products} selectedBrandId={brandFilter} />
    </div>
  );
}
