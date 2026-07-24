'use client';

import { useEffect, useState } from 'react';
import { CustomFieldsCard } from './custom-fields-card';
import { loadEntityCustomFields } from '@/app/(dashboard)/settings/custom-fields/save-actions';
import { Loader2 } from 'lucide-react';

interface FieldWithValue {
  field: { id: string; key: string; label: string; type: string; options: any; required: boolean; helpText: string | null };
  value: string | null;
}

/**
 * Carga los campos personalizados de una entidad bajo demanda (para usar dentro
 * de diálogos, donde no hay una carga previa en servidor). No renderiza nada si
 * la entidad no tiene campos definidos.
 */
export function CustomFieldsCardLazy({ entity, entityId }: { entity: 'CONTACT' | 'COMPANY' | 'DEAL' | 'LEAD'; entityId: string }) {
  const [items, setItems] = useState<FieldWithValue[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadEntityCustomFields(entity, entityId)
      .then((data) => { if (alive) setItems(data as FieldWithValue[]); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [entity, entityId]);

  if (items === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando campos personalizados…
      </div>
    );
  }
  if (items.length === 0) return null;

  return <CustomFieldsCard entity={entity} entityId={entityId} items={items} />;
}
