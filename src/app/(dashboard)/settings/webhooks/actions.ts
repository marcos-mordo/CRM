'use server';

import { z } from 'zod';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { WebhookEvent } from '@prisma/client';

const schema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  description: z.string().max(500).optional(),
  events: z.array(z.nativeEnum(WebhookEvent)).min(1),
  active: z.boolean().optional(),
});

export async function createWebhook(input: z.infer<typeof schema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = schema.parse(input);

  await prisma.webhookEndpoint.create({
    data: {
      ...parsed,
      active: parsed.active ?? true,
      secret: crypto.randomBytes(24).toString('hex'),
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function updateWebhook(id: string, input: z.infer<typeof schema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = schema.parse(input);
  await prisma.webhookEndpoint.update({
    where: { id, organizationId: session.user.organizationId },
    data: parsed,
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function deleteWebhook(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  await prisma.webhookEndpoint.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function rotateSecret(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const newSecret = crypto.randomBytes(24).toString('hex');
  await prisma.webhookEndpoint.update({
    where: { id, organizationId: session.user.organizationId },
    data: { secret: newSecret },
  });
  revalidatePath('/settings');
  return { ok: true, secret: newSecret };
}
