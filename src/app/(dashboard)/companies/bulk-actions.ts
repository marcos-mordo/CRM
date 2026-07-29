'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

const bulkSchema = z.object({ ids: z.array(z.string()).min(1).max(500) });

export async function bulkDeleteCompanies(input: z.infer<typeof bulkSchema>) {
  const session = await requireAuth();
  if (session.user.role === 'VIEWER') throw new Error('Tu rol no puede eliminar');
  const parsed = bulkSchema.parse(input);
  const result = await prisma.company.deleteMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
  });
  revalidatePath('/companies');
  return { ok: true, count: result.count };
}

export async function bulkExportCompaniesCsv(input: z.infer<typeof bulkSchema>): Promise<string> {
  const session = await requireAuth();
  const parsed = bulkSchema.parse(input);
  const companies = await prisma.company.findMany({
    where: { id: { in: parsed.ids }, organizationId: session.user.organizationId },
    include: { _count: { select: { contacts: true, deals: true } } },
  });
  const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    ['Empresa', 'Sector', 'Web', 'Email', 'Teléfono', 'Ciudad', 'País', 'Tamaño', 'Facturación anual', 'Contactos', 'Oportunidades'].join(','),
    ...companies.map((c) =>
      [c.name, c.industry, c.website, c.email, c.phone, c.city, c.country, c.size, c.annualRevenue ? Number(c.annualRevenue) : '', c._count.contacts, c._count.deals].map(cell).join(',')
    ),
  ].join('\n');
}
