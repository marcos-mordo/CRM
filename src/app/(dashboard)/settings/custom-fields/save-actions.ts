'use server';

import { requireAuth } from '@/lib/auth-helpers';
import { saveCustomFieldValues, getCustomFieldsWithValues } from '@/lib/custom-fields';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CustomFieldEntity } from '@prisma/client';

/** Carga (bajo demanda) los campos personalizados + valores de una entidad. */
export async function loadEntityCustomFields(entity: CustomFieldEntity, entityId: string) {
  const session = await requireAuth();
  const items = await getCustomFieldsWithValues(entity, entityId, session.user.organizationId);
  return items.map((it) => ({
    field: {
      id: it.field.id, key: it.field.key, label: it.field.label, type: it.field.type,
      options: it.field.options, required: it.field.required, helpText: it.field.helpText,
    },
    value: it.value,
  }));
}

/**
 * Guarda los valores de campos personalizados de una entidad concreta.
 * Verifica los obligatorios y que el usuario pertenece a la organización.
 */
export async function saveEntityCustomFields(entity: CustomFieldEntity, entityId: string, values: Record<string, string>) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  // Validación de obligatorios
  const required = await prisma.customField.findMany({
    where: { organizationId: orgId, entity, active: true, required: true },
    select: { key: true, label: true },
  });
  for (const r of required) {
    const v = values[r.key];
    if (v === undefined || v === null || String(v).trim() === '') {
      throw new Error(`El campo "${r.label}" es obligatorio`);
    }
  }

  await saveCustomFieldValues(entity, entityId, orgId, values);

  if (entity === 'CONTACT') revalidatePath(`/contacts/${entityId}`);
  if (entity === 'DEAL') revalidatePath('/pipeline');
  if (entity === 'COMPANY') revalidatePath('/companies');
  if (entity === 'LEAD') revalidatePath('/leads');
  return { ok: true };
}
