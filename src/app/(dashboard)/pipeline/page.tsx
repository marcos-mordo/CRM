import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { PipelineBoard } from '@/components/pipeline/pipeline-board';
import { NewDealButton } from '@/components/pipeline/new-deal-button';
import { ExportButton } from '@/components/export-button';
import { getTranslations } from 'next-intl/server';

export default async function PipelinePage() {
  const session = await requireAuth();
  const t = await getTranslations('Pipeline');

  const [pipeline, contacts, companies, users, org, products] = await Promise.all([
    prisma.pipeline.findFirst({
      where: { organizationId: session.user.organizationId, isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            deals: {
              where: { status: 'OPEN' },
              include: { contact: true, company: true, owner: true, lineItems: { orderBy: { createdAt: 'asc' } } },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    }),
    prisma.contact.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { firstName: 'asc' },
    }),
    prisma.company.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { rottingDays: true },
    }),
    prisma.product.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      select: { id: true, name: true, price: true, sku: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!pipeline) {
    return <div>No hay pipeline configurado</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={pipeline.name}>
        <ExportButton entity="deals" />
        <NewDealButton pipeline={pipeline} contacts={contacts} companies={companies} users={users} />
      </PageHeader>

      <PipelineBoard
        pipeline={pipeline}
        contacts={contacts}
        companies={companies}
        users={users}
        products={products}
        rottingDays={org?.rottingDays ?? 14}
      />
    </div>
  );
}
