'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';

export async function retryDelivery(deliveryId: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');

  const delivery = await prisma.webhookDelivery.findFirstOrThrow({
    where: { id: deliveryId, organizationId: session.user.organizationId },
    include: { endpoint: true },
  });

  const body = JSON.stringify({
    event: delivery.event,
    timestamp: new Date().toISOString(),
    organizationId: session.user.organizationId,
    data: delivery.payload,
    retryOf: delivery.id,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'BrandHub-Webhooks/1.0',
    'X-BrandHub-Event': delivery.event,
    'X-BrandHub-Delivery': delivery.id,
    'X-BrandHub-Retry': '1',
  };

  if (delivery.endpoint.secret) {
    const sig = crypto.createHmac('sha256', delivery.endpoint.secret).update(body).digest('hex');
    headers['X-BrandHub-Signature'] = `sha256=${sig}`;
  }

  let httpStatus: number | null = null;
  let response = '';
  let ok = false;
  let lastError: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(delivery.endpoint.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    httpStatus = res.status;
    response = (await res.text().catch(() => '')).slice(0, 2000);
    ok = res.ok;
    if (!ok) lastError = `HTTP ${res.status}`;
  } catch (err: any) {
    lastError = err?.message?.slice(0, 1000) ?? 'unknown error';
  }

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: ok ? 'SUCCESS' : 'FAILED',
      httpStatus,
      response,
      attempts: delivery.attempts + 1,
      deliveredAt: new Date(),
      lastError,
    },
  });

  revalidatePath('/settings/webhooks/deliveries');
  return { ok, httpStatus, error: lastError };
}
