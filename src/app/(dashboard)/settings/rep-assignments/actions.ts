'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { CommissionType } from '@prisma/client';

const assignSchema = z.object({
  userId: z.string(),
  brandId: z.string(),
  territory: z.string().max(120).optional(),
  customCommissionType: z.nativeEnum(CommissionType).optional().nullable(),
  customCommissionValue: z.number().min(0).optional().nullable(),
});

export async function upsertRepAssignment(input: z.infer<typeof assignSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = assignSchema.parse(input);

  await prisma.repBrandAssignment.upsert({
    where: {
      userId_brandId: { userId: parsed.userId, brandId: parsed.brandId },
    },
    update: {
      territory: parsed.territory,
      customCommissionType: parsed.customCommissionType,
      customCommissionValue: parsed.customCommissionValue,
      active: true,
    },
    create: {
      userId: parsed.userId,
      brandId: parsed.brandId,
      territory: parsed.territory,
      customCommissionType: parsed.customCommissionType,
      customCommissionValue: parsed.customCommissionValue,
      organizationId: session.user.organizationId,
    },
  });

  revalidatePath('/settings');
  return { ok: true };
}

export async function deleteRepAssignment(userId: string, brandId: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  await prisma.repBrandAssignment.delete({
    where: { userId_brandId: { userId, brandId } },
  });
  revalidatePath('/settings');
  return { ok: true };
}
