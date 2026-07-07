import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { WorkflowsManager } from '@/components/workflows/workflows-manager';

export default async function WorkflowsPage() {
  const session = await requireAuth();

  const workflows = await prisma.workflow.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      runs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automatizaciones"
        description="Si pasa algo en tu CRM, BrandHub actúa solo: crea tareas, avisa al equipo, envía emails…"
      />
      <WorkflowsManager workflows={workflows} />
    </div>
  );
}
