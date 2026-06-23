import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { TemplatesList } from '@/components/contract-templates/templates-list';
import { TemplateDialog } from '@/components/contract-templates/template-dialog';

export default async function ContractTemplatesPage() {
  const session = await requireAuth();

  const [templates, brands] = await Promise.all([
    prisma.contractTemplate.findMany({
      where: { organizationId: session.user.organizationId },
      include: { brand: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.brand.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de contrato"
        description={`${templates.length} plantillas`}
      >
        <TemplateDialog brands={brands} />
      </PageHeader>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Sin plantillas todavía"
            description="Crea una plantilla base de contrato para cada marca, con variables sustituibles."
            action={<TemplateDialog brands={brands} />}
          />
        </Card>
      ) : (
        <TemplatesList templates={templates} brands={brands} />
      )}
    </div>
  );
}
