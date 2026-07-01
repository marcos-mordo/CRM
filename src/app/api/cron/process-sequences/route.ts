import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint que procesa email sequences.
 * Vercel Cron: 0 * * * * (cada hora).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.emailSequenceEnrollment.findMany({
    where: { status: 'ACTIVE', nextRunAt: { lte: now } },
    include: {
      sequence: { include: { steps: { orderBy: { order: 'asc' } } } },
    },
    take: 200,
  });

  let sent = 0, completed = 0;
  for (const enr of due) {
    if (!enr.sequence.active) continue;
    const step = enr.sequence.steps[enr.currentStep];
    if (!step) {
      await prisma.emailSequenceEnrollment.update({
        where: { id: enr.id },
        data: { status: 'COMPLETED', completedAt: now },
      });
      completed++;
      continue;
    }

    const contact = await prisma.contact.findFirst({
      where: { id: enr.contactId, organizationId: enr.organizationId },
    });
    if (!contact?.email) {
      await prisma.emailSequenceEnrollment.update({
        where: { id: enr.id },
        data: { status: 'PAUSED' },
      });
      continue;
    }

    try {
      await sendMail({ to: contact.email, subject: step.subject, html: step.bodyHtml });
      sent++;

      const nextStep = enr.currentStep + 1;
      const nextRun = enr.sequence.steps[nextStep]
        ? new Date(now.getTime() + enr.sequence.steps[nextStep].delayDays * 24 * 3600 * 1000)
        : now;

      await prisma.emailSequenceEnrollment.update({
        where: { id: enr.id },
        data: {
          currentStep: nextStep,
          nextRunAt: nextRun,
          status: enr.sequence.steps[nextStep] ? 'ACTIVE' : 'COMPLETED',
          completedAt: enr.sequence.steps[nextStep] ? null : now,
        },
      });
      if (!enr.sequence.steps[nextStep]) completed++;
    } catch (err) {
      console.error('[seq]', err);
    }
  }

  return NextResponse.json({ ok: true, sent, completed, checked: due.length });
}
