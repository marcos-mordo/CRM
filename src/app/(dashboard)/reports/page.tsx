import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export default async function ReportsPage() {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Exporta KPIs y rankings en PDF o CSV" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Reporte ejecutivo mensual</CardTitle>
                <CardDescription>KPIs + ranking + marcas, PDF</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" asChild>
              <a href="/api/reports/executive?months=1" download>
                <Download className="h-4 w-4" /> Último mes
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/api/reports/executive?months=3" download>
                <Download className="h-4 w-4" /> Último trimestre
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/api/reports/executive?months=12" download>
                <Download className="h-4 w-4" /> Últimos 12 meses
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Ventas detalladas</CardTitle>
                <CardDescription>Una fila por venta, CSV abierto en Excel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/api/sales/export" download>
                <Download className="h-4 w-4" /> Descargar CSV
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Comisiones</CardTitle>
                <CardDescription>Histórico para cierre de nómina</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/api/commissions/export" download>
                <Download className="h-4 w-4" /> Descargar CSV
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
