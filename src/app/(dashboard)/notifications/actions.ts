'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export async function markNotificationRead(id: string) {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath('/notifications');
  return { ok: true };
}
