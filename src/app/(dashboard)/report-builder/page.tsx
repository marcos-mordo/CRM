import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { ReportBuilder } from '@/components/reports/report-builder';

export default async function ReportBuilderPage() {
  const session = await requireAuth();

  const saved = await prisma.savedReport.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informes"
        description="Construye el informe que necesites en 4 clics: qué medir, agrupado por qué, en qué periodo"
      />
      <ReportBuilder
        saved={saved.map((s) => ({
          id: s.id,
          name: s.name,
          config: s.config as any,
          by: s.createdBy.name ?? '',
        }))}
      />
    </div>
  );
}
