import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { triggerWorkflows } from '@/lib/workflows';
import type { WebhookEvent } from '@prisma/client';

interface DispatchInput {
  organizationId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
}

/**
 * Dispatch fire-and-forget de un evento a todos los endpoints activos
 * suscritos. NO bloquea la request del usuario; los fallos quedan registrados
 * en WebhookDelivery para reintentar manualmente.
 *
 * También dispara los workflows de automatización de la org: cualquier
 * evento webhook es a la vez un trigger de workflow.
 */
export async function dispatchWebhook(input: DispatchInput): Promise<void> {
  triggerWorkflows({
    organizationId: input.organizationId,
    trigger: input.event,
    payload: input.payload,
  });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: input.organizationId,
      active: true,
      events: { has: input.event },
    },
  });

  if (endpoints.length === 0) return;

  const body = JSON.stringify({
    event: input.event,
    timestamp: new Date().toISOString(),
    organizationId: input.organizationId,
    data: input.payload,
  });

  // Lanzar en paralelo, no esperar
  Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          organizationId: input.organizationId,
          endpointId: endpoint.id,
          event: input.event,
          payload: input.payload as any,
          status: 'PENDING',
        },
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BrandHub-Webhooks/1.0',
        'X-BrandHub-Event': input.event,
        'X-BrandHub-Delivery': delivery.id,
      };

      if (endpoint.secret) {
        const sig = crypto.createHmac('sha256', endpoint.secret).update(body).digest('hex');
        headers['X-BrandHub-Signature'] = `sha256=${sig}`;
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const responseText = await res.text().catch(() => '');

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: res.ok ? 'SUCCESS' : 'FAILED',
            httpStatus: res.status,
            response: responseText.slice(0, 2000),
            attempts: 1,
            deliveredAt: new Date(),
            lastError: res.ok ? null : `HTTP ${res.status}`,
          },
        });
      } catch (err: any) {
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            attempts: 1,
            deliveredAt: new Date(),
            lastError: err?.message?.slice(0, 1000) ?? 'unknown error',
          },
        });
      }
    })
  ).catch(() => {
    // swallow - los errores ya se guardan por delivery
  });
}
