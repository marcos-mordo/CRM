'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';

function slugify(label: string): string {
  return label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'campo';
}

const fieldSchema = z.object({
  entity: z.nativeEnum(CustomFieldEntity),
  label: z.string().min(1, 'La etiqueta es obligatoria').max(80),
  type: z.nativeEnum(CustomFieldType),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  helpText: z.string().max(200).optional(),
});

async function requireAdmin() {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  return session;
}

export async function createCustomField(input: z.infer<typeof fieldSchema>) {
  const session = await requireAdmin();
  const data = fieldSchema.parse(input);
  const orgId = session.user.organizationId;

  // key único por org+entity: deriva del label y desambigua si choca
  let key = slugify(data.label);
  const existing = await prisma.customField.findMany({
    where: { organizationId: orgId, entity: data.entity },
    select: { key: true, order: true },
  });
  const keys = new Set(existing.map((e) => e.key));
  if (keys.has(key)) { let i = 2; while (keys.has(`${key}_${i}`)) i++; key = `${key}_${i}`; }
  const maxOrder = existing.reduce((m, e) => Math.max(m, e.order), -1);

  await prisma.customField.create({
    data: {
      organizationId: orgId,
      entity: data.entity,
      key,
      label: data.label,
      type: data.type,
      options: data.options && data.options.length > 0 ? data.options : undefined,
      required: data.required,
      helpText: data.helpText || null,
      order: maxOrder + 1,
    },
  });
  revalidatePath('/settings/custom-fields');
  return { ok: true };
}

export async function updateCustomField(id: string, input: Partial<{ label: string; required: boolean; helpText: string; options: string[]; active: boolean }>) {
  const session = await requireAdmin();
  const field = await prisma.customField.findFirst({ where: { id, organizationId: session.user.organizationId } });
  if (!field) throw new Error('Campo no encontrado');
  await prisma.customField.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.helpText !== undefined ? { helpText: input.helpText || null } : {}),
      ...(input.options !== undefined ? { options: input.options.length > 0 ? input.options : undefined } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  revalidatePath('/settings/custom-fields');
  return { ok: true };
}

export async function deleteCustomField(id: string) {
  const session = await requireAdmin();
  const field = await prisma.customField.findFirst({ where: { id, organizationId: session.user.organizationId } });
  if (!field) throw new Error('Campo no encontrado');
  await prisma.customField.delete({ where: { id } }); // cascada borra los valores
  revalidatePath('/settings/custom-fields');
  return { ok: true };
}

export async function reorderCustomField(id: string, dir: -1 | 1) {
  const session = await requireAdmin();
  const field = await prisma.customField.findFirst({ where: { id, organizationId: session.user.organizationId } });
  if (!field) throw new Error('Campo no encontrado');
  const siblings = await prisma.customField.findMany({
    where: { organizationId: session.user.organizationId, entity: field.entity },
    orderBy: { order: 'asc' },
  });
  const i = siblings.findIndex((s) => s.id === id);
  const j = i + dir;
  if (j < 0 || j >= siblings.length) return { ok: true };
  await prisma.$transaction([
    prisma.customField.update({ where: { id: siblings[i].id }, data: { order: siblings[j].order } }),
    prisma.customField.update({ where: { id: siblings[j].id }, data: { order: siblings[i].order } }),
  ]);
  revalidatePath('/settings/custom-fields');
  return { ok: true };
}
