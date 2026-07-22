import { requireAuth } from '@/lib/auth-helpers';
import { PageHeader } from '@/components/dashboard/page-header';
import { ImportWizard } from '@/components/import/import-wizard';
import { IMPORTS } from '@/lib/import-registry';

export default async function ImportPage() {
  await requireAuth();

  const entities = Object.entries(IMPORTS).map(([key, def]) => ({
    key,
    label: def.label,
    fields: def.fields.map((f) => ({ key: f.key, label: f.label, required: f.required })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar datos"
        description="Migra tus contactos, empresas, leads, productos y clientes desde Excel, CSV u otro CRM"
      />
      <ImportWizard entities={entities} />
    </div>
  );
}
