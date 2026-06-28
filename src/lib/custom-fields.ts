import { prisma } from '@/lib/prisma';
import type { CustomFieldEntity } from '@prisma/client';

/**
 * Obtiene los custom fields definidos para una entidad y sus valores
 * en una instancia concreta. Devuelve [{field, value}, ...] para render.
 */
export async function getCustomFieldsWithValues(
  entity: CustomFieldEntity,
  entityId: string,
  organizationId: string
) {
  const fields = await prisma.customField.findMany({
    where: { entity, organizationId, active: true },
    orderBy: { order: 'asc' },
    include: {
      values: { where: { entityId } },
    },
  });

  return fields.map((f) => ({
    field: f,
    value: f.values[0]?.value ?? f.defaultValue ?? null,
  }));
}

/**
 * Guarda los valores de custom fields para una entidad.
 * `values` es un objeto { fieldKey: value }.
 */
export async function saveCustomFieldValues(
  entity: CustomFieldEntity,
  entityId: string,
  organizationId: string,
  values: Record<string, string | null>
) {
  const fields = await prisma.customField.findMany({
    where: { entity, organizationId, active: true },
  });

  await Promise.all(
    fields
      .filter((f) => values[f.key] !== undefined)
      .map((f) => {
        const v = values[f.key];
        if (v === null || v === '') {
          return prisma.customFieldValue.deleteMany({
            where: { entity, entityId, fieldId: f.id },
          });
        }
        return prisma.customFieldValue.upsert({
          where: { entity_entityId_fieldId: { entity, entityId, fieldId: f.id } },
          create: { entity, entityId, fieldId: f.id, value: String(v), organizationId },
          update: { value: String(v) },
        });
      })
  );
}
