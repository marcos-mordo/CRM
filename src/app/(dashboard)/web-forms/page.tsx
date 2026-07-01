import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { WebFormsManager } from '@/components/webform/web-forms-manager';

export default async function WebFormsPage() {
  const session = await requireAuth();

  const forms = await prisma.webForm.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: 'desc' },
    include: { owner: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formularios web"
        description="Formularios embebibles en tu web para capturar leads automáticamente"
      />
      <WebFormsManager forms={forms} />
    </div>
  );
}
