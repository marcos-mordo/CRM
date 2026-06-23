'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, canManage } from '@/lib/auth-helpers';
import { logAudit } from '@/lib/audit';

export async function approveCommission(id: string) {
  const session = await requireAuth();
  if (!canManage(session.user.role)) throw new Error('No autorizado');
  const c = await prisma.commission.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status: 'APPROVED' },
  });
  await logAudit({
    action: 'COMMISSION_APPROVED',
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    actorName: session.user.name,
    actorRole: session.user.role,
    entity: 'Commission',
    entityId: id,
    metadata: { amount: Number(c.amount), repId: c.representativeId },
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
  const c = await prisma.commission.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidMethod: parsed.method,
      paidReference: parsed.reference,
    },
  });
  await logAudit({
    action: 'COMMISSION_PAID',
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    actorName: session.user.name,
    actorRole: session.user.role,
    entity: 'Commission',
    entityId: id,
    metadata: { amount: Number(c.amount), method: parsed.method, reference: parsed.reference, repId: c.representativeId },
  });
  revalidatePath('/commissions');
  return { ok: true };
}
