import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 10_000;
const KEEPALIVE_MS = 25_000;

/**
 * Server-Sent Events stream. Cada N segundos hace polling a la DB y
 * empuja al cliente solo si hay cambios. Más eficiente que polling
 * desde N tabs abiertas porque no recarga toda la página.
 *
 * Para escalar a varios servidores haría falta un bus (Redis pub/sub),
 * pero para un solo nodo esto basta y es 100x mejor que polling cliente.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let closed = false;
  let lastUnread = -1;
  let lastNotificationId: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send('hello', { userId, ts: Date.now() });

      const tick = async () => {
        if (closed) return;
        try {
          const [unread, latest] = await Promise.all([
            prisma.notification.count({ where: { userId, read: false } }),
            prisma.notification.findFirst({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              select: { id: true, type: true, title: true, message: true, link: true, createdAt: true },
            }),
          ]);

          if (unread !== lastUnread) {
            send('unread', { count: unread });
            lastUnread = unread;
          }

          if (latest && latest.id !== lastNotificationId) {
            if (lastNotificationId !== null) {
              // No es la primera carga: notificación nueva
              send('notification', latest);
            }
            lastNotificationId = latest.id;
          }
        } catch (err) {
          // ignore — manejado por keepalive
        }
      };

      // primer tick
      await tick();

      const pollInterval = setInterval(tick, POLL_INTERVAL_MS);
      const keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          closed = true;
        }
      }, KEEPALIVE_MS);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(keepalive);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
