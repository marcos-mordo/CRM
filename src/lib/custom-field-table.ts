import { prisma } from './prisma';
import type { CustomFieldEntity } from '@prisma/client';

export interface CustomFieldTableData {
  fields: { key: string; label: string }[];
  // valuesByRow[rowId][fieldKey] = valor listo para mostrar
  valuesByRow: Record<string, Record<string, string>>;
}

/**
 * Carga los campos personalizados activos de una entidad y sus valores,
 * en forma SERIALIZABLE para pasar a una tabla cliente. Cada tabla los añade
 * como columnas opcionales (ocultas por defecto) en su menú "Columnas".
 */
export async function getCustomFieldTableData(organizationId: string, entity: CustomFieldEntity): Promise<CustomFieldTableData> {
  const fields = await prisma.customField.findMany({
    where: { organizationId, entity, active: true },
    orderBy: { order: 'asc' },
    select: { id: true, key: true, label: true },
  });
  if (fields.length === 0) return { fields: [], valuesByRow: {} };

  const values = await prisma.customFieldValue.findMany({
    where: { organizationId, entity },
    select: { entityId: true, fieldId: true, value: true },
  });
  const fieldKeyById = new Map(fields.map((f) => [f.id, f.key]));

  const valuesByRow: Record<string, Record<string, string>> = {};
  for (const v of values) {
    const key = fieldKeyById.get(v.fieldId);
    if (!key) continue;
    let raw = v.value ?? '';
    if (raw.startsWith('[')) {
      try { const arr = JSON.parse(raw); if (Array.isArray(arr)) raw = arr.join(', '); } catch { /* raw */ }
    }
    (valuesByRow[v.entityId] ??= {})[key] = raw;
  }

  return { fields: fields.map((f) => ({ key: f.key, label: f.label })), valuesByRow };
}
