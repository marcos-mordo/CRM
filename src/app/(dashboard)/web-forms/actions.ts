'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || Math.random().toString(36).slice(2, 10);
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  notifyEmails: z.string().max(500).optional(),
});

const DEFAULT_FIELDS = [
  { key: 'firstName', label: 'Nombre', type: 'text', required: true },
  { key: 'lastName',  label: 'Apellidos', type: 'text', required: true },
  { key: 'email',     label: 'Email', type: 'email', required: true },
  { key: 'phone',     label: 'Teléfono', type: 'tel', required: false },
  { key: 'message',   label: 'Mensaje', type: 'textarea', required: false },
];

export async function createWebForm(input: z.infer<typeof createSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores');
  const parsed = createSchema.parse(input);

  // Slug único
  let base = slugify(parsed.name);
  let slug = base;
  let n = 0;
  while (await prisma.webForm.findUnique({ where: { slug } })) {
    n++; slug = `${base}-${n}`;
  }

  const form = await prisma.webForm.create({
    data: {
      slug,
      name: parsed.name,
      title: parsed.title,
      fields: DEFAULT_FIELDS,
      notifyEmails: parsed.notifyEmails,
      ownerId: session.user.id,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/web-forms');
  return { ok: true, id: form.id, slug: form.slug };
}

export async function deleteWebForm(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores');
  await prisma.webForm.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/web-forms');
  return { ok: true };
}
