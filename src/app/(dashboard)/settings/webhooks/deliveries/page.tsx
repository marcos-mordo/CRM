import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WebhookDeliveriesTable } from '@/components/settings/webhook-deliveries-table';

const PAGE_SIZE = 50;

export default async function WebhookDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ endpoint?: string; status?: string; page?: string }>;
}) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect('/dashboard');

  const { endpoint, status, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  const where = {
    organizationId: session.user.organizationId,
    ...(endpoint ? { endpointId: endpoint } : {}),
    ...(status ? { status: status as any } : {}),
  };

  const [deliveries, total, endpoints] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      include: { endpoint: { select: { id: true, name: true, url: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.webhookDelivery.count({ where }),
    prisma.webhookEndpoint.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de webhook deliveries" description={`${total} envíos registrados`}>
        <Button variant="outline" asChild>
          <Link href="/settings">Volver a Settings</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <WebhookDeliveriesTable
            deliveries={deliveries}
            endpoints={endpoints}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            selectedEndpoint={endpoint}
            selectedStatus={status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
