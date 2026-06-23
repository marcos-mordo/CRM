'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, canManage } from '@/lib/auth-helpers';

export async function approveCommission(id: string) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  await prisma.commission.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status: 'APPROVED' },
  });
  revalidatePath('/commissions');
  return { ok: true };
}

const paySchema = z.object({
  method: z.string().min(1),
  reference: z.string().optional(),
});

export async function payCommission(id: string, input: z.infer<typeof paySchema>) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const parsed = paySchema.parse(input);
  await prisma.commission.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidMethod: parsed.method,
      paidReference: parsed.reference,
    },
  });
  revalidatePath('/commissions');
  return { ok: true };
}
