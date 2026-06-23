import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Handshake } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { SalesTable } from '@/components/sales/sales-table';
import { NewSaleButton } from '@/components/sales/new-sale-button';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default async function SalesOrdersPage() {
  const session = await requireAuth();
  const t = await getTranslations('Sales');

  const [sales, brands, customers, products] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        brand: true,
        endCustomer: true,
        representative: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brand.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.endCustomer.findMany({
      where: { organizationId: session.user.organizationId, gdprConsent: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.brandProduct.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      include: { brand: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const canCreate = brands.length > 0 && customers.length > 0 && products.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${sales.length} ventas`}>
        {sales.length > 0 && (
          <Button variant="outline" asChild>
            <a href="/api/sales/export" download>
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
          </Button>
        )}
        {canCreate && <NewSaleButton brands={brands} customers={customers} products={products} />}
      </PageHeader>

      {sales.length === 0 ? (
        <Card>
          {canCreate ? (
            <EmptyState
              icon={Handshake}
              title={t('noSales')}
              action={<NewSaleButton brands={brands} customers={customers} products={products} />}
            />
          ) : (
            <EmptyState
              icon={Handshake}
              title="Falta configurar el catálogo"
              description={
                brands.length === 0
                  ? 'Primero crea al menos una marca con productos.'
                  : products.length === 0
                    ? 'Las marcas no tienen productos en su catálogo todavía.'
                    : 'Primero crea al menos un cliente final con consentimiento RGPD.'
              }
              action={
                <Button asChild>
                  <Link href={brands.length === 0 ? '/brands' : products.length === 0 ? '/catalog' : '/end-customers'}>
                    Ir a configurar
                  </Link>
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <Card>
          <SalesTable sales={sales} />
        </Card>
      )}
    </div>
  );
}
