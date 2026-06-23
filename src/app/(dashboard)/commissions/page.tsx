import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Wallet, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { CommissionsTable } from '@/components/commissions/commissions-table';
import { getTranslations } from 'next-intl/server';
import { formatCurrency } from '@/lib/utils';

export default async function CommissionsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Commissions');

  const [commissions, summary] = await Promise.all([
    prisma.commission.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        sale: { include: { brand: true, endCustomer: true } },
        representative: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commission.groupBy({
      by: ['status'],
      where: { organizationId: session.user.organizationId },
      _sum: { amount: true },
    }),
  ]);

  const totals = {
    PENDING: 0,
    APPROVED: 0,
    PAID: 0,
    CANCELLED: 0,
  } as Record<string, number>;
  for (const row of summary) {
    totals[row.status] = Number(row._sum.amount ?? 0);
  }

  const kpis = [
    { label: t('totalPending'), value: totals.PENDING, icon: Clock, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: t('totalApproved'), value: totals.APPROVED, icon: CheckCircle, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: t('totalPaid'), value: totals.PAID, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${commissions.length} registros`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg ${kpi.color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-xl font-bold">{formatCurrency(kpi.value)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        {commissions.length === 0 ? (
          <EmptyState icon={Wallet} title={t('noCommissions')} />
        ) : (
          <CommissionsTable
            commissions={commissions}
            canManage={session.user.role === 'OWNER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER'}
          />
        )}
      </Card>
    </div>
  );
}
