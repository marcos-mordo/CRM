'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { LeadStatus } from '@prisma/client';

const bulkSchema = z.object({ ids: z.array(z.string()).min(1).max(500) });

export async function bulkAssignLeadOwner(input: z.infer<typeof bulkSchema> & { ownerId: string }) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede modificar');
  const parsed = bulkSchema.parse({ ids: input.ids });
  const result = await prisma.lead.updateMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    data: { ownerId: input.ownerId },
  });
  revalidatePath('/leads');
  return { ok: true, count: result.count };
}

export async function bulkSetLeadStatus(input: z.infer<typeof bulkSchema> & { status: LeadStatus }) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede modificar');
  const parsed = bulkSchema.parse({ ids: input.ids });
  const status = z.nativeEnum(LeadStatus).parse(input.status);
  const result = await prisma.lead.updateMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath('/leads');
  return { ok: true, count: result.count };
}

export async function bulkDeleteLeads(input: z.infer<typeof bulkSchema>) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede eliminar');
  const parsed = bulkSchema.parse(input);
  const result = await prisma.lead.deleteMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
  });
  revalidatePath('/leads');
  return { ok: true, count: result.count };
}

export async function bulkExportLeadsCsv(input: z.infer<typeof bulkSchema>): Promise<string> {
  const session = await requireAuth();
  const parsed = bulkSchema.parse(input);
  const leads = await prisma.lead.findMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    include: { owner: { select: { name: true } } },
  });
  const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    ['Nombre', 'Apellidos', 'Email', 'Teléfono', 'Empresa', 'Cargo', 'Estado', 'Score', 'Valor estimado', 'Origen', 'Responsable'].join(','),
    ...leads.map((l) =>
      [l.firstName, l.lastName, l.email, l.phone, l.company, l.jobTitle, l.status, l.score, l.estimatedValue ? Number(l.estimatedValue) : '', l.source, l.owner?.name].map(cell).join(',')
    ),
  ].join('\n');
}
