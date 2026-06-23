import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Download, FileText, User as UserIcon } from 'lucide-react';
import { AttachmentsManager } from '@/components/sales/attachments-manager';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import type { SaleStatus } from '@prisma/client';

const statusVariant: Record<SaleStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_SIGN: 'warning',
  SIGNED: 'default',
  ACTIVE: 'success',
  CANCELLED: 'outline',
  REFUNDED: 'destructive',
};

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const t = await getTranslations();

  const sale = await prisma.sale.findUnique({
    where: { id, organizationId: session.user.organizationId },
    include: {
      brand: true,
      endCustomer: true,
      representative: true,
      lines: { include: { product: true }, orderBy: { order: 'asc' } },
      commissions: true,
      attachments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!sale) return notFound();

  const customerName = sale.endCustomer.isCompany
    ? sale.endCustomer.companyName
    : `${sale.endCustomer.firstName} ${sale.endCustomer.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader title={`${sale.number}`} description={customerName ?? ''}>
        <Button variant="outline" asChild>
          <Link href="/sales-orders">{t('Sales.title')}</Link>
        </Button>
        <Button asChild>
          <a href={`/api/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
            {t('Sales.downloadContract')}
          </a>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Líneas</CardTitle>
                <CardDescription>{sale.lines.length} productos</CardDescription>
              </div>
              <Badge variant={statusVariant[sale.status]} className="text-sm">
                {t(`Sales.status.${sale.status}` as any)}
              </Badge>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2">Producto</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">P. Unit.</th>
                    <th className="text-right">Comisión</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.lines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium">{line.description}</p>
                        {line.product && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {line.product.sku}
                          </p>
                        )}
                      </td>
                      <td className="text-right">{Number(line.quantity)}</td>
                      <td className="text-right">{formatCurrency(Number(line.unitPrice), sale.currency)}</td>
                      <td className="text-right text-green-600 dark:text-green-400 text-xs">
                        {formatCurrency(Number(line.commissionAmount), sale.currency)}
                      </td>
                      <td className="text-right font-medium">{formatCurrency(Number(line.total), sale.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-right pt-3 text-sm text-muted-foreground">Subtotal</td>
                    <td className="text-right pt-3">{formatCurrency(Number(sale.subtotal), sale.currency)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-right text-sm text-muted-foreground">IVA</td>
                    <td className="text-right">{formatCurrency(Number(sale.taxAmount), sale.currency)}</td>
                  </tr>
                  <tr className="text-base font-bold">
                    <td colSpan={4} className="text-right pt-2 border-t">TOTAL</td>
                    <td className="text-right pt-2 border-t">{formatCurrency(Number(sale.total), sale.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {sale.signatureData && (
            <Card>
              <CardHeader>
                <CardTitle>Firma del cliente</CardTitle>
                <CardDescription>
                  {sale.signedAt && `Firmado el ${formatDateTime(sale.signedAt)}`}
                  {sale.signatureMethod && ` · método: ${sale.signatureMethod}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-white p-4 flex justify-center">
                  <img src={sale.signatureData} alt="Firma" className="max-h-32" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('Sales.attachments')}</CardTitle>
              <CardDescription>DNI escaneado, facturas previas, fotos, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentsManager saleId={sale.id} attachments={sale.attachments} />
            </CardContent>
          </Card>

          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {sale.endCustomer.isCompany ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                {customerName}
              </div>
              <p className="text-muted-foreground"><strong>{sale.endCustomer.isCompany ? 'CIF' : 'DNI'}:</strong> {sale.endCustomer.taxId}</p>
              {sale.endCustomer.email && <p className="text-muted-foreground">{sale.endCustomer.email}</p>}
              {(sale.endCustomer.mobile || sale.endCustomer.phone) && (
                <p className="text-muted-foreground">{sale.endCustomer.mobile || sale.endCustomer.phone}</p>
              )}
              {sale.endCustomer.address && (
                <p className="text-muted-foreground">
                  {sale.endCustomer.address}
                  {sale.endCustomer.postalCode && `, ${sale.endCustomer.postalCode}`}
                  {sale.endCustomer.city && ` ${sale.endCustomer.city}`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Marca</p>
                <Badge variant="secondary">{sale.brand.name}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Representante</p>
                <p>{sale.representative.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha venta</p>
                <p>{formatDate(sale.saleDate)}</p>
              </div>
              {sale.activatedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Activada</p>
                  <p>{formatDate(sale.activatedAt)}</p>
                </div>
              )}
              {sale.cancelledAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Cancelada</p>
                  <p>{formatDate(sale.cancelledAt)}</p>
                  {sale.cancelReason && <p className="text-xs text-destructive">{sale.cancelReason}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                Tu comisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(Number(sale.totalCommission), sale.currency)}
              </p>
              {sale.commissions.map((c) => (
                <div key={c.id} className="mt-2 text-xs space-y-1">
                  <Badge variant={c.status === 'PAID' ? 'success' : c.status === 'APPROVED' ? 'default' : 'warning'}>
                    {t(`Commissions.status.${c.status}` as any)}
                  </Badge>
                  {c.paidAt && <p className="text-muted-foreground">Pagada {formatDate(c.paidAt)}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
