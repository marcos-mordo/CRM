import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePortalCustomer } from '@/lib/portal-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { formatCurrency, formatDate } from '@/lib/utils';
import { signOutPortal } from './actions';

export default async function PortalDashboard() {
  const customer = await requirePortalCustomer();
  if (!customer) redirect('/portal/login');

  const [org, sales] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: customer.organizationId },
      select: { name: true, currency: true },
    }),
    prisma.sale.findMany({
      where: { endCustomerId: customer.id, organizationId: customer.organizationId },
      include: { brand: { select: { name: true } } },
      orderBy: { saleDate: 'desc' },
    }),
  ]);

  const customerName = customer.isCompany
    ? customer.companyName
    : `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();

  const activeSales = sales.filter((s) => s.status === 'ACTIVE' || s.status === 'SIGNED');
  const totalSpent = activeSales.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo size={40} />
          <div>
            <CardTitle>Hola, {customer.firstName ?? customerName}</CardTitle>
            <CardDescription>Tu área en {org.name}</CardDescription>
          </div>
        </div>
        <form action={signOutPortal}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Contratos activos</p>
            <p className="text-2xl font-bold mt-1">{activeSales.length}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total contratado</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpent, org.currency)}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Histórico</p>
            <p className="text-2xl font-bold mt-1">{sales.length}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Mis contratos</h3>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin contratos todavía.</p>
          ) : (
            <ul className="space-y-2">
              {sales.map((s) => (
                <li key={s.id} className="border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      <code className="font-mono">{s.number}</code> · {s.brand.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.saleDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'SIGNED' ? 'default' : 'secondary'}>
                      {s.status}
                    </Badge>
                    <p className="font-bold text-sm">{formatCurrency(Number(s.total), s.currency)}</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/portal/contract/${s.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 border-t">
          ¿Necesitas ayuda? Contacta con {org.name} directamente.
        </p>
      </CardContent>
    </Card>
  );
}
