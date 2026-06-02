import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { CampaignsTable } from '@/components/campaigns/campaigns-table';
import { CampaignDialog } from '@/components/campaigns/campaign-dialog';
import { getTranslations } from 'next-intl/server';

export default async function CampaignsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Campaigns');

  const [campaigns, lists] = await Promise.all([
    prisma.campaign.findMany({
      where: { organizationId: session.user.organizationId },
      include: { lists: { include: { list: true } }, createdBy: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emailList.findMany({
      where: { organizationId: session.user.organizationId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${campaigns.length} campañas`}>
        <CampaignDialog lists={lists} userEmail={session.user.email!} userName={session.user.name!} />
      </PageHeader>

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={t('new')}
            description="Crea tu primera campaña de email marketing"
            action={<CampaignDialog lists={lists} userEmail={session.user.email!} userName={session.user.name!} />}
          />
        ) : (
          <CampaignsTable campaigns={campaigns} />
        )}
      </Card>
    </div>
  );
}
