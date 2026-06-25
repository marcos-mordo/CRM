'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { sendMail } from '@/lib/mailer';

const campaignSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
  fromName: z.string().min(1).max(120),
  fromEmail: z.string().email(),
  htmlContent: z.string().min(1),
  listIds: z.array(z.string()).min(1),
  // A/B testing opcional
  abEnabled: z.boolean().optional(),
  abSubjectB: z.string().max(200).optional(),
  abHtmlB: z.string().optional(),
});

export async function createCampaign(input: z.infer<typeof campaignSchema>) {
  const session = await requireAuth();
  const parsed = campaignSchema.parse(input);

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.name,
      subject: parsed.subject,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      htmlContent: parsed.htmlContent,
      abEnabled: parsed.abEnabled ?? false,
      abSubjectB: parsed.abSubjectB,
      abHtmlB: parsed.abHtmlB,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
      lists: { create: parsed.listIds.map((listId) => ({ listId })) },
    },
  });

  revalidatePath('/campaigns');
  return { ok: true, id: campaign.id };
}

export async function sendCampaign(id: string) {
  const session = await requireAuth();
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id, organizationId: session.user.organizationId },
    include: {
      lists: { include: { list: { include: { members: { include: { contact: true } } } } } },
    },
  });

  const recipientEmails = new Set<string>();
  for (const cl of campaign.lists) {
    for (const m of cl.list.members) {
      if (m.contact.email && !m.unsubscribed) recipientEmails.add(m.contact.email);
    }
  }

  if (recipientEmails.size === 0) {
    throw new Error('La campaña no tiene destinatarios con email válido');
  }

  await prisma.campaign.update({ where: { id }, data: { status: 'SENDING' } });

  let sent = 0;
  let sentA = 0;
  let sentB = 0;
  const failed: string[] = [];

  // Si A/B está activado y hay variante B, repartimos 50/50
  const useAB = campaign.abEnabled && campaign.abSubjectB && campaign.abHtmlB;

  let idx = 0;
  for (const email of recipientEmails) {
    const variant: 'A' | 'B' | null = useAB ? (idx % 2 === 0 ? 'A' : 'B') : null;
    const subject = variant === 'B' ? campaign.abSubjectB! : campaign.subject;
    const html = variant === 'B' ? campaign.abHtmlB! : campaign.htmlContent;

    try {
      await sendMail({
        to: email,
        subject,
        html,
        from: campaign.fromEmail,
        fromName: campaign.fromName,
      });
      await prisma.emailTracking.create({ data: { campaignId: id, email, variant } });
      sent++;
      if (variant === 'A') sentA++;
      if (variant === 'B') sentB++;
    } catch (e) {
      console.error('Send failed for', email, e);
      failed.push(email);
    }
    idx++;
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status: failed.length === recipientEmails.size ? 'FAILED' : 'SENT',
      sentAt: new Date(),
      recipientsCount: sent,
      recipientsA: useAB ? sentA : 0,
      recipientsB: useAB ? sentB : 0,
    },
  });

  revalidatePath('/campaigns');
  return { ok: true, sent, failed: failed.length, variantA: sentA, variantB: sentB };
}

export async function deleteCampaign(id: string) {
  const session = await requireAuth();
  await prisma.campaign.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/campaigns');
  return { ok: true };
}

/**
 * Determina el ganador basado en CTR (clicks/abiertos). Llamarlo manualmente o
 * en cron tras un periodo de espera (ej: 24h después de enviar).
 */
export async function decideAbWinner(id: string) {
  const session = await requireAuth();
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!campaign.abEnabled || campaign.winnerVariant) return { ok: false };

  const ctrA = campaign.recipientsA > 0 ? campaign.clickedA / campaign.recipientsA : 0;
  const ctrB = campaign.recipientsB > 0 ? campaign.clickedB / campaign.recipientsB : 0;
  const winner = ctrA >= ctrB ? 'A' : 'B';

  await prisma.campaign.update({ where: { id }, data: { winnerVariant: winner } });
  revalidatePath('/campaigns');
  return { ok: true, winner, ctrA, ctrB };
}
