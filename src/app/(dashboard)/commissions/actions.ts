'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, canManage } from '@/lib/auth-helpers';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { dispatchWebhook } from '@/lib/webhooks';

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
  await notify({
    organizationId: session.user.organizationId,
    userId: c.representativeId,
    type: 'COMMISSION_APPROVED',
    title: `Tu comisión de ${Number(c.amount).toFixed(2)} ${c.currency} fue aprobada`,
    message: `Pendiente de pago.`,
    link: '/commissions',
  });
  await dispatchWebhook({
    organizationId: session.user.organizationId,
    event: 'COMMISSION_APPROVED',
    payload: {
      commissionId: c.id,
      saleId: c.saleId,
      representativeId: c.representativeId,
      amount: Number(c.amount),
      currency: c.currency,
    },
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
  await notify({
    organizationId: session.user.organizationId,
    userId: c.representativeId,
    type: 'COMMISSION_PAID',
    title: `Te han pagado ${Number(c.amount).toFixed(2)} ${c.currency}`,
    message: `Método: ${parsed.method}${parsed.reference ? ` · Ref: ${parsed.reference}` : ''}`,
    link: '/me',
  });
  await dispatchWebhook({
    organizationId: session.user.organizationId,
    event: 'COMMISSION_PAID',
    payload: {
      commissionId: c.id,
      saleId: c.saleId,
      representativeId: c.representativeId,
      amount: Number(c.amount),
      currency: c.currency,
      method: parsed.method,
      reference: parsed.reference,
    },
  });
  revalidatePath('/commissions');
  return { ok: true };
}
