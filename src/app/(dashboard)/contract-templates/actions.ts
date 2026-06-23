'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  brandId: z.string().optional().nullable(),
  htmlContent: z.string().min(10),
  pdfHeaderUrl: z.string().max(500).optional(),
  pdfFooterUrl: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

export async function createContractTemplate(input: z.infer<typeof templateSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = templateSchema.parse(input);
  await prisma.contractTemplate.create({
    data: {
      ...parsed,
      brandId: parsed.brandId || null,
      active: parsed.active ?? true,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/contract-templates');
  return { ok: true };
}

export async function updateContractTemplate(id: string, input: z.infer<typeof templateSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = templateSchema.parse(input);
  const existing = await prisma.contractTemplate.findUniqueOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  await prisma.contractTemplate.update({
    where: { id },
    data: {
      ...parsed,
      brandId: parsed.brandId || null,
      version: existing.version + 1,
    },
  });
  revalidatePath('/contract-templates');
  return { ok: true };
}

export async function deleteContractTemplate(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  await prisma.contractTemplate.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  revalidatePath('/contract-templates');
  return { ok: true };
}
