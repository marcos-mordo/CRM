'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

const pageSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function upsertBookingPage(input: z.infer<typeof pageSchema>) {
  const session = await requireAuth();
  const parsed = pageSchema.parse(input);

  const availability: Record<string, [string, string]> = {};
  for (const d of parsed.weekdays) availability[String(d)] = [parsed.startTime, parsed.endTime];

  const existing = await prisma.bookingPage.findFirst({
    where: { userId: session.user.id, organizationId: session.user.organizationId },
  });

  if (existing) {
    await prisma.bookingPage.update({
      where: { id: existing.id },
      data: {
        title: parsed.title,
        description: parsed.description,
        durationMinutes: parsed.durationMinutes,
        availability,
      },
    });
    revalidatePath('/bookings');
    return { ok: true, slug: existing.slug };
  }

  // Slug único basado en el nombre del usuario
  const base = slugify(session.user.name || session.user.email?.split('@')[0] || 'reserva');
  let slug = base;
  let n = 0;
  while (await prisma.bookingPage.findUnique({ where: { slug } })) {
    n++; slug = `${base}-${n}`;
  }

  const page = await prisma.bookingPage.create({
    data: {
      slug,
      title: parsed.title,
      description: parsed.description,
      durationMinutes: parsed.durationMinutes,
      availability,
      userId: session.user.id,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/bookings');
  return { ok: true, slug: page.slug };
}

export async function toggleBookingPage(active: boolean) {
  const session = await requireAuth();
  await prisma.bookingPage.updateMany({
    where: { userId: session.user.id, organizationId: session.user.organizationId },
    data: { active },
  });
  revalidatePath('/bookings');
  return { ok: true };
}

export async function cancelBooking(id: string) {
  const session = await requireAuth();
  const booking = await prisma.booking.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { bookingPage: { select: { userId: true } } },
  });
  if (!booking) throw new Error('Reserva no encontrada');
  if (booking.bookingPage.userId !== session.user.id && !['OWNER', 'ADMIN'].includes(session.user.role)) {
    throw new Error('Solo el propietario o un admin');
  }
  await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  revalidatePath('/bookings');
  return { ok: true };
}
