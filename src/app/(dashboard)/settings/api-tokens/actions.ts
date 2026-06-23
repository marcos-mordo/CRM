'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { generateToken } from '@/lib/api-auth';
import { ApiTokenScope } from '@prisma/client';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.nativeEnum(ApiTokenScope)).min(1),
  expiresAt: z.string().optional().nullable(),
});

export async function createApiToken(input: z.infer<typeof createSchema>): Promise<{ ok: true; plain: string; prefix: string }> {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = createSchema.parse(input);

  const { plain, prefix, hash } = generateToken();

  await prisma.apiToken.create({
    data: {
      name: parsed.name,
      scopes: parsed.scopes,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      tokenHash: hash,
      prefix,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
    },
  });

  revalidatePath('/settings');
  return { ok: true, plain, prefix };
}

export async function revokeApiToken(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  await prisma.apiToken.update({
    where: { id, organizationId: session.user.organizationId },
    data: { revokedAt: new Date() },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function deleteApiToken(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  await prisma.apiToken.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/settings');
  return { ok: true };
}
