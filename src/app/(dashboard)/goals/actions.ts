'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';

const goalSchema = z.object({
  userId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  metric: z.enum(['sales_count', 'sales_amount', 'commission', 'deals_won', 'calls_made']),
  target: z.number().min(0),
});

export async function upsertGoal(input: z.infer<typeof goalSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores pueden gestionar metas');
  const parsed = goalSchema.parse(input);

  await prisma.goal.upsert({
    where: { userId_period_metric: { userId: parsed.userId, period: parsed.period, metric: parsed.metric } },
    create: {
      userId: parsed.userId,
      period: parsed.period,
      metric: parsed.metric,
      target: parsed.target,
      organizationId: session.user.organizationId,
    },
    update: { target: parsed.target },
  });

  revalidatePath('/goals');
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo administradores');
  await prisma.goal.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/goals');
  return { ok: true };
}
