import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { EmailTemplatesList } from '@/components/email-templates/templates-list';
import { EmailTemplateDialog } from '@/components/email-templates/template-dialog';

export default async function EmailTemplatesPage() {
  const session = await requireAuth();

  const templates = await prisma.emailTemplate.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Plantillas de email" description={`${templates.length} plantillas`}>
        <EmailTemplateDialog />
      </PageHeader>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="Sin plantillas todavía"
            description="Crea plantillas reusables para tus campañas: bienvenida, recordatorio, oferta."
            action={<EmailTemplateDialog />}
          />
        </Card>
      ) : (
        <EmailTemplatesList templates={templates} />
      )}
    </div>
  );
}
