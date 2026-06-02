'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { slugify } from '@/lib/utils';

const articleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  category: z.string().max(80).optional(),
  published: z.boolean().optional(),
});

export async function createArticle(input: z.infer<typeof articleSchema>) {
  const session = await requireAuth();
  const parsed = articleSchema.parse(input);

  let slug = slugify(parsed.title);
  let attempt = 0;
  while (await prisma.article.findUnique({ where: { organizationId_slug: { organizationId: session.user.organizationId, slug } } })) {
    attempt++;
    slug = `${slugify(parsed.title)}-${attempt}`;
  }

  await prisma.article.create({
    data: {
      ...parsed,
      slug,
      published: parsed.published ?? false,
      organizationId: session.user.organizationId,
      authorId: session.user.id,
    },
  });
  revalidatePath('/knowledge');
  return { ok: true };
}

export async function updateArticle(id: string, input: z.infer<typeof articleSchema>) {
  const session = await requireAuth();
  const parsed = articleSchema.parse(input);
  await prisma.article.update({
    where: { id, organizationId: session.user.organizationId },
    data: parsed,
  });
  revalidatePath('/knowledge');
  return { ok: true };
}

export async function deleteArticle(id: string) {
  const session = await requireAuth();
  await prisma.article.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/knowledge');
  return { ok: true };
}
