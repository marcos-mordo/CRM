import { prisma } from '@/lib/prisma';
import { sendTelegram } from '@/lib/telegram';
import type { NotificationType } from '@prisma/client';

// Tipos críticos que también se envían a Telegram si el user tiene chatId
const TELEGRAM_CRITICAL: NotificationType[] = ['SALE_SIGNED', 'COMMISSION_PAID', 'COMMISSION_APPROVED'];

interface NotifyInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: input.metadata,
      },
    });

    // Telegram para eventos críticos
    if (TELEGRAM_CRITICAL.includes(input.type)) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { telegramChatId: true },
      });
      if (user?.telegramChatId) {
        const text = `<b>${input.title}</b>${input.message ? `\n${input.message}` : ''}`;
        await sendTelegram({ chatId: user.telegramChatId, text }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[notify] failed to create notification', input.type, err);
  }
}

export async function notifyManagers(input: Omit<NotifyInput, 'userId'> & { exceptUserId?: string }) {
  const managers = await prisma.user.findMany({
    where: {
      organizationId: input.organizationId,
      active: true,
      role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      ...(input.exceptUserId ? { id: { not: input.exceptUserId } } : {}),
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: managers.map((m) => ({
      organizationId: input.organizationId,
      userId: m.id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata as any,
    })),
  });
}
