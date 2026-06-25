import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyShareToken } from '@/lib/public-share';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { Download, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata = { title: 'Contrato compartido · BrandHub' };

export default async function ShareSalePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const saleId = verifyShareToken(token);
  if (!saleId) return notFound();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      brand: true,
      endCustomer: true,
      organization: true,
      lines: { orderBy: { order: 'asc' } },
    },
  });

  if (!sale) return notFound();

  const customerName = sale.endCustomer.isCompany
    ? sale.endCustomer.companyName
    : `${sale.endCustomer.firstName ?? ''} ${sale.endCustomer.lastName ?? ''}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 py-12">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b">
          <div className="flex items-center gap-3">
            <BrandLogo size={48} />
            <div>
              <CardTitle className="text-xl">{sale.number}</CardTitle>
              <p className="text-xs text-muted-foreground">{sale.organization.name}</p>
            </div>
          </div>
          <Badge variant={sale.status === 'ACTIVE' ? 'success' : sale.status === 'SIGNED' ? 'default' : 'secondary'}>
            {sale.status}
          </Badge>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
              <p className="font-medium">{customerName}</p>
              <p className="text-xs text-muted-foreground">{sale.endCustomer.taxId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Marca</p>
              <p className="font-medium">{sale.brand.name}</p>
              <p className="text-xs text-muted-foreground">Fecha: {formatDate(sale.saleDate)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Servicios</p>
            <ul className="space-y-2">
              {sale.lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{line.description}</p>
                    <p className="text-xs text-muted-foreground">{Number(line.quantity)} × {formatCurrency(Number(line.unitPrice), sale.currency)}</p>
                  </div>
                  <p className="font-bold text-sm">{formatCurrency(Number(line.total), sale.currency)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(sale.subtotal), sale.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatCurrency(Number(sale.taxAmount), sale.currency)}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t"><span>Total</span><span>{formatCurrency(Number(sale.total), sale.currency)}</span></div>
          </div>

          {sale.signedAt && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Firmado digitalmente</p>
                <p className="text-xs">{formatDate(sale.signedAt)} · método: {sale.signatureMethod ?? 'canvas'}</p>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button asChild>
              <a href={`/share/sale/${token}/pdf`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Descargar contrato PDF
              </a>
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center border-t pt-3">
            Este enlace es de solo lectura. Para gestionar o editar la venta, accede al panel de {sale.organization.name}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
