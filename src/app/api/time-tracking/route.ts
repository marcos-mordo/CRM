import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET  /api/time-tracking → devuelve el timer activo del usuario (si hay)
 * POST /api/time-tracking → inicia un timer (body: {taskId?, contactId?, dealId?, description?})
 * PATCH /api/time-tracking → detiene el timer activo
 */

export async function GET() {
  const session = await requireAuth();
  const active = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  return NextResponse.json({ active });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));

  // Detiene cualquier timer activo primero
  const now = new Date();
  await prisma.timeEntry.updateMany({
    where: { userId: session.user.id, endedAt: null },
    data: { endedAt: now },
  });

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      taskId: body.taskId ?? null,
      contactId: body.contactId ?? null,
      dealId: body.dealId ?? null,
      description: body.description ?? null,
      billable: body.billable ?? false,
      startedAt: now,
    },
  });
  return NextResponse.json({ ok: true, entry });
}

export async function PATCH() {
  const session = await requireAuth();
  const now = new Date();

  const active = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, endedAt: null },
  });
  if (!active) return NextResponse.json({ error: 'no_active_timer' }, { status: 404 });

  const seconds = Math.floor((now.getTime() - active.startedAt.getTime()) / 1000);
  const updated = await prisma.timeEntry.update({
    where: { id: active.id },
    data: { endedAt: now, seconds },
  });
  return NextResponse.json({ ok: true, entry: updated });
}
