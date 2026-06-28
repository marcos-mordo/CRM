import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint para generar tareas a partir de TaskTemplate activos.
 * Llamarlo cada día a las 00:00 (Vercel Cron, systemd timer, o el cron de tu host).
 *
 * Seguridad: header x-cron-secret = process.env.CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = today.getDay();
  const monthDay = today.getDate();

  const templates = await prisma.taskTemplate.findMany({
    where: { active: true },
  });

  let created = 0;
  for (const t of templates) {
    // Check si toca generar HOY
    let due = false;
    if (t.cadence === 'daily') due = true;
    else if (t.cadence === 'weekly' && t.weekday === weekday) due = true;
    else if (t.cadence === 'monthly' && t.monthDay === monthDay) due = true;

    if (!due) continue;

    // Evita duplicar si ya generamos hoy
    if (t.lastGenerated) {
      const last = new Date(t.lastGenerated);
      if (last >= today) continue;
    }

    // creator obligatorio: usa el assignee, o el primer admin de la org
    let creatorId: string | null = t.assignedToId ?? null;
    if (!creatorId) {
      const admin = await prisma.user.findFirst({
        where: { organizationId: t.organizationId, role: { in: ['OWNER', 'ADMIN'] } },
        select: { id: true },
      });
      creatorId = admin?.id ?? null;
    }
    if (!creatorId) continue;

    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        priority: t.priority as any,
        status: 'PENDING',
        assigneeId: t.assignedToId,
        creatorId,
        organizationId: t.organizationId,
        dueDate: new Date(today.getTime() + 24 * 3600 * 1000),
      },
    });
    await prisma.taskTemplate.update({
      where: { id: t.id },
      data: { lastGenerated: now },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, total: templates.length, date: today.toISOString() });
}
