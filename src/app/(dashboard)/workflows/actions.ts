'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';

const conditionSchema = z.object({
  field: z.string().min(1).max(60),
  op: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']),
  value: z.string().max(200),
});

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_task'),     params: z.object({ title: z.string().min(1).max(200), priority: z.string().optional() }) }),
  z.object({ type: z.literal('notify_managers'), params: z.object({ title: z.string().min(1).max(200), message: z.string().max(500).optional() }) }),
  z.object({ type: z.literal('send_email'),      params: z.object({ to: z.string().email(), subject: z.string().min(1).max(200), body: z.string().min(1).max(5000) }) }),
  z.object({ type: z.literal('http_webhook'),    params: z.object({ url: z.string().url() }) }),
]);

const workflowSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.enum(['SALE_CREATED', 'SALE_SIGNED', 'SALE_CANCELLED', 'COMMISSION_APPROVED', 'COMMISSION_PAID', 'CUSTOMER_CREATED', 'LEAD_CREATED']),
  conditions: z.array(conditionSchema).max(5).optional(),
  actions: z.array(actionSchema).min(1).max(5),
});

export async function createWorkflow(input: z.infer<typeof workflowSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores pueden crear automatizaciones');
  const parsed = workflowSchema.parse(input);

  const wf = await prisma.workflow.create({
    data: {
      name: parsed.name,
      trigger: parsed.trigger,
      conditions: (parsed.conditions ?? []) as any,
      actions: parsed.actions as any,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
    },
  });
  revalidatePath('/workflows');
  return { ok: true, id: wf.id };
}

export async function toggleWorkflow(id: string, active: boolean) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores');
  await prisma.workflow.update({
    where: { id, organizationId: session.user.organizationId },
    data: { active },
  });
  revalidatePath('/workflows');
  return { ok: true };
}

export async function deleteWorkflow(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores');
  await prisma.workflow.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/workflows');
  return { ok: true };
}
