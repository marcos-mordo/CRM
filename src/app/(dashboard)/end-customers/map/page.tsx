import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { CustomersMap } from '@/components/end-customers/customers-map';
import { Card, CardContent } from '@/components/ui/card';

export default async function CustomersMapPage() {
  const session = await requireAuth();

  const customers = await prisma.endCustomer.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true,
      isCompany: true,
      companyName: true,
      firstName: true,
      lastName: true,
      city: true,
      country: true,
      postalCode: true,
      address: true,
      email: true,
      mobile: true,
      _count: { select: { sales: true } },
    },
    take: 500,
  });

  // Agrupamos por ciudad para geocoding simplificado
  const byCity = new Map<string, typeof customers>();
  for (const c of customers) {
    if (!c.city) continue;
    const key = `${c.city.toLowerCase()}|${(c.country ?? 'ES').toLowerCase()}`;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key)!.push(c);
  }

  const cityGroups = Array.from(byCity.entries()).map(([key, items]) => {
    const [city, country] = key.split('|');
    return {
      city,
      country,
      count: items.length,
      totalSales: items.reduce((s, c) => s + c._count.sales, 0),
      customers: items.map((c) => ({
        id: c.id,
        name: c.isCompany ? c.companyName ?? '—' : `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
        sales: c._count.sales,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de clientes"
        description={`${customers.length} clientes geolocalizados en ${cityGroups.length} ciudades`}
      />
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <CustomersMap groups={cityGroups} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold mb-3">Ciudades con más clientes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {cityGroups
              .sort((a, b) => b.count - a.count)
              .slice(0, 12)
              .map((g) => (
                <div key={`${g.city}-${g.country}`} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm capitalize">{g.city}</p>
                    <p className="text-xs text-muted-foreground uppercase">{g.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{g.count}</p>
                    <p className="text-xs text-muted-foreground">{g.totalSales} ventas</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
