import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@prisma/client';

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
