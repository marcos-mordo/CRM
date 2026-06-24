'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { isAIConfigured, scoreLead } from '@/lib/ai';

export async function scoreLeadAction(leadId: string) {
  const session = await requireAuth();
  if (!isAIConfigured()) throw new Error('AI no configurada (ANTHROPIC_API_KEY)');

  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, organizationId: session.user.organizationId },
  });
  const activitiesCount = await prisma.activity.count({ where: { leadId, organizationId: session.user.organizationId } });
  const daysSinceCreated = Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const result = await scoreLead({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    source: lead.source,
    status: lead.status,
    estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    notes: lead.notes,
    daysSinceCreated,
    activitiesCount,
  });

  await prisma.leadScore.upsert({
    where: { leadId },
    update: { ...result, computedAt: new Date() },
    create: { ...result, leadId, organizationId: session.user.organizationId },
  });

  // También actualizamos el score numérico del Lead para que se vea en la tabla
  await prisma.lead.update({ where: { id: leadId }, data: { score: result.probability } });

  revalidatePath('/leads');
  return { ok: true, result };
}

export async function scoreAllLeadsAction() {
  const session = await requireAuth();
  if (!isAIConfigured()) throw new Error('AI no configurada');

  // Solo leads NEW/CONTACTED/QUALIFIED sin scoring reciente (< 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: session.user.organizationId,
      status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] },
      OR: [{ aiScore: null }, { aiScore: { computedAt: { lt: since } } }],
    },
    take: 20, // batch máximo para evitar consumir muchos tokens
  });

  let scored = 0;
  for (const lead of leads) {
    try {
      await scoreLeadAction(lead.id);
      scored++;
    } catch {
      // silenciar para no romper el batch
    }
  }
  revalidatePath('/leads');
  return { scored, total: leads.length };
}
