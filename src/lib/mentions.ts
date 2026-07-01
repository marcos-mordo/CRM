import { prisma } from './prisma';
import { notify } from './notifications';

const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;

/**
 * Extrae @usuario del contenido, hace match con users de la org,
 * crea NoteMention y notifica al mencionado.
 */
export async function processMentions(
  noteId: string,
  content: string,
  organizationId: string,
  authorId: string,
  authorName: string
): Promise<void> {
  const matches = Array.from(content.matchAll(MENTION_REGEX));
  if (matches.length === 0) return;

  const handles = [...new Set(matches.map((m) => m[1].toLowerCase()))];
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      OR: handles.map((h) => ({
        OR: [
          { email: { startsWith: h, mode: 'insensitive' as const } },
          { name: { contains: h, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: { id: true, email: true, name: true },
    take: 10,
  });

  for (const u of users) {
    if (u.id === authorId) continue; // no notif a uno mismo
    try {
      await prisma.noteMention.upsert({
        where: { noteId_mentionedUserId: { noteId, mentionedUserId: u.id } },
        create: { noteId, mentionedUserId: u.id },
        update: {},
      });
      await notify({
        userId: u.id,
        organizationId,
        type: 'MENTION',
        title: `${authorName} te mencionó`,
        message: content.slice(0, 140),
        link: '/notifications',
      }).catch(() => null);
    } catch {}
  }
}
