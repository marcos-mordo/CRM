'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { notify } from '@/lib/notifications';

const createSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  title: z.string().max(120).optional(),
  firstMessage: z.string().max(2000).optional(),
});

export async function createConversation(input: z.infer<typeof createSchema>) {
  const session = await requireAuth();
  const parsed = createSchema.parse(input);
  const userId = session.user.id;

  // Si es 1:1, intentar reutilizar conversación existente
  const allParticipants = [userId, ...parsed.participantIds.filter((id) => id !== userId)];
  if (allParticipants.length === 2 && !parsed.title) {
    const existing = await prisma.conversation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        title: null,
        AND: allParticipants.map((id) => ({
          participants: { some: { userId: id } },
        })),
      },
    });
    if (existing) {
      const count = await prisma.conversationParticipant.count({ where: { conversationId: existing.id } });
      if (count === 2) {
        if (parsed.firstMessage) {
          await prisma.message.create({
            data: { conversationId: existing.id, authorId: userId, content: parsed.firstMessage },
          });
        }
        return { ok: true, conversationId: existing.id };
      }
    }
  }

  const conv = await prisma.conversation.create({
    data: {
      organizationId: session.user.organizationId,
      title: parsed.title ?? null,
      participants: {
        create: allParticipants.map((id) => ({ userId: id })),
      },
      ...(parsed.firstMessage
        ? { messages: { create: [{ authorId: userId, content: parsed.firstMessage }] } }
        : {}),
    },
  });

  revalidatePath('/chat');
  return { ok: true, conversationId: conv.id };
}

export async function sendMessage(conversationId: string, content: string) {
  const session = await requireAuth();
  const text = content.trim();
  if (!text) throw new Error('Mensaje vacío');
  if (text.length > 5000) throw new Error('Mensaje demasiado largo');

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!participant) throw new Error('No perteneces a esta conversación');

  const message = await prisma.message.create({
    data: {
      conversationId,
      authorId: session.user.id,
      content: text,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });

  // Notificar a los demás participantes no silenciados
  const others = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
      userId: { not: session.user.id },
      muted: false,
    },
    select: { userId: true },
  });
  await Promise.all(
    others.map((p) =>
      notify({
        organizationId: session.user.organizationId,
        userId: p.userId,
        type: 'MENTION',
        title: `Nuevo mensaje de ${session.user.name}`,
        message: text.slice(0, 120),
        link: `/chat?c=${conversationId}`,
      })
    )
  );

  revalidatePath('/chat');
  return { ok: true, message };
}

export async function markConversationRead(conversationId: string) {
  const session = await requireAuth();
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  });
  return { ok: true };
}
