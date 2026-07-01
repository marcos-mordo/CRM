'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export async function saveNotificationPrefs(input: {
  emailDigest: boolean;
  emailInstant: boolean;
  pushEnabled: boolean;
  telegramEnabled: boolean;
  events: Record<string, boolean>;
}) {
  const session = await requireAuth();
  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...input },
    update: input,
  });
  revalidatePath('/settings/notifications');
  return { ok: true };
}
