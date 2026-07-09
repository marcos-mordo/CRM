import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAvailableSlots } from '@/lib/booking';
import { notify } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/book/[slug]?date=2026-07-10 → slots disponibles ese día
 * POST /api/book/[slug] → crea la reserva {name, email, phone?, notes?, startsAt}
 * Público, sin auth.
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.bookingPage.findFirst({ where: { slug, active: true } });
  if (!page) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const dateStr = req.nextUrl.searchParams.get('date');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const slots = await getAvailableSlots(page.id, new Date(y, m - 1, d));
  return NextResponse.json({ slots });
}

const bookSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.bookingPage.findFirst({
    where: { slug, active: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!page) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + page.durationMinutes * 60 * 1000);

  // Revalidar que el slot sigue libre (carrera entre dos visitantes)
  const slots = await getAvailableSlots(page.id, startsAt);
  const valid = slots.some((s) => new Date(s.startsAt).getTime() === startsAt.getTime());
  if (!valid) {
    return NextResponse.json({ error: 'slot_taken', message: 'Ese hueco acaba de ocuparse. Elige otro.' }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      bookingPageId: page.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      startsAt,
      endsAt,
      organizationId: page.organizationId,
    },
  });

  // Tarea para el rep + notificación
  const when = startsAt.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  await Promise.allSettled([
    prisma.task.create({
      data: {
        title: `Reunión con ${parsed.data.name} — ${when}`,
        description: [`Email: ${parsed.data.email}`, parsed.data.phone && `Tel: ${parsed.data.phone}`, parsed.data.notes && `Notas: ${parsed.data.notes}`].filter(Boolean).join('\n'),
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: startsAt,
        creatorId: page.user.id,
        assigneeId: page.user.id,
        organizationId: page.organizationId,
      },
    }),
    notify({
      organizationId: page.organizationId,
      userId: page.user.id,
      type: 'SYSTEM',
      title: `Nueva reunión: ${parsed.data.name}`,
      message: `${when} · ${parsed.data.email}`,
      link: '/bookings',
    }),
  ]);

  return NextResponse.json({ ok: true, bookingId: booking.id });
}
