'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { switchOrganization } from '@/lib/current-org';
import { slugify } from '@/lib/utils';

export async function switchToOrg(organizationId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('No autenticado');
  await switchOrganization((session.user as any).id, organizationId);
  revalidatePath('/', 'layout');
  return { ok: true };
}

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
});

/**
 * Crea una nueva organización y al usuario actual como OWNER en ella.
 * Útil para que un usuario gestione varias agencias desde la misma cuenta.
 */
export async function createOrganization(input: z.infer<typeof createOrgSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error('No autenticado');
  const parsed = createOrgSchema.parse(input);
  const userId = (session.user as any).id as string;

  let slug = slugify(parsed.name);
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${slugify(parsed.name)}-${attempt}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.name,
      slug,
      memberships: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
      pipelines: {
        create: {
          name: 'Pipeline principal',
          isDefault: true,
          stages: {
            create: [
              { name: 'Nuevo', order: 0, probability: 10, color: '#94a3b8' },
              { name: 'Contactado', order: 1, probability: 25, color: '#3b82f6' },
              { name: 'Propuesta', order: 2, probability: 50, color: '#8b5cf6' },
              { name: 'Negociación', order: 3, probability: 75, color: '#f59e0b' },
              { name: 'Cerrado ganado', order: 4, probability: 100, color: '#10b981' },
            ],
          },
        },
      },
    },
  });

  await switchOrganization(userId, org.id);
  revalidatePath('/', 'layout');
  return { ok: true, organizationId: org.id };
}
