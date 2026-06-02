'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { DealStatus } from '@prisma/client';

const dealSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(5000).optional(),
  amount: z.number().min(0),
  currency: z.string().max(10).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().nullable(),
  source: z.string().max(80).optional(),
  pipelineId: z.string(),
  stageId: z.string(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export async function createDeal(input: z.infer<typeof dealSchema>) {
  const session = await requireAuth();
  const parsed = dealSchema.parse(input);
  const deal = await prisma.deal.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      amount: parsed.amount,
      currency: parsed.currency || 'USD',
      probability: parsed.probability ?? 50,
      expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null,
      source: parsed.source,
      pipelineId: parsed.pipelineId,
      stageId: parsed.stageId,
      contactId: parsed.contactId || null,
      companyId: parsed.companyId || null,
      ownerId: parsed.ownerId || session.user.id,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/pipeline');
  return { ok: true, id: deal.id };
}

export async function updateDeal(id: string, input: Partial<z.infer<typeof dealSchema>>) {
  const session = await requireAuth();
  const data: any = { ...input };
  if (input.expectedCloseDate) data.expectedCloseDate = new Date(input.expectedCloseDate);
  if (input.contactId === '') data.contactId = null;
  if (input.companyId === '') data.companyId = null;
  if (input.ownerId === '') data.ownerId = null;

  await prisma.deal.update({
    where: { id, organizationId: session.user.organizationId },
    data,
  });
  revalidatePath('/pipeline');
  return { ok: true };
}

export async function moveDeal(dealId: string, stageId: string) {
  const session = await requireAuth();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId }, include: { pipeline: true } });
  if (stage.pipeline.organizationId !== session.user.organizationId) throw new Error('forbidden');

  await prisma.deal.update({
    where: { id: dealId, organizationId: session.user.organizationId },
    data: { stageId, probability: stage.probability },
  });
  revalidatePath('/pipeline');
  return { ok: true };
}

export async function setDealStatus(dealId: string, status: DealStatus, lostReason?: string) {
  const session = await requireAuth();
  await prisma.deal.update({
    where: { id: dealId, organizationId: session.user.organizationId },
    data: {
      status,
      closedAt: status === 'OPEN' ? null : new Date(),
      lostReason: status === 'LOST' ? lostReason : null,
    },
  });
  revalidatePath('/pipeline');
  return { ok: true };
}

export async function deleteDeal(id: string) {
  const session = await requireAuth();
  await prisma.deal.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/pipeline');
  return { ok: true };
}
