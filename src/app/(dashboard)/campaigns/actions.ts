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
  const failed: string[] = [];

  for (const email of recipientEmails) {
    try {
      await sendMail({
        to: email,
        subject: campaign.subject,
        html: campaign.htmlContent,
        from: campaign.fromEmail,
        fromName: campaign.fromName,
      });
      await prisma.emailTracking.create({ data: { campaignId: id, email } });
      sent++;
    } catch (e) {
      console.error('Send failed for', email, e);
      failed.push(email);
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status: failed.length === recipientEmails.size ? 'FAILED' : 'SENT',
      sentAt: new Date(),
      recipientsCount: sent,
    },
  });

  revalidatePath('/campaigns');
  return { ok: true, sent, failed: failed.length };
}

export async function deleteCampaign(id: string) {
  const session = await requireAuth();
  await prisma.campaign.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/campaigns');
  return { ok: true };
}
