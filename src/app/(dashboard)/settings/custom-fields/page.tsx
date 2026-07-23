import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { CustomFieldsManager } from '@/components/settings/custom-fields-manager';

export const dynamic = 'force-dynamic';

export default async function CustomFieldsPage() {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect('/settings');

  const fields = await prisma.customField.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ entity: 'asc' }, { order: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campos personalizados"
        description="Añade tus propios campos a contactos, empresas, oportunidades y leads — a medida de tu negocio"
      />
      <CustomFieldsManager fields={fields.map((f) => ({
        id: f.id, entity: f.entity, key: f.key, label: f.label, type: f.type,
        options: (f.options as string[] | null) ?? [], required: f.required, helpText: f.helpText, active: f.active, order: f.order,
      }))} />
    </div>
  );
}
