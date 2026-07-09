import { prisma } from './prisma';

export type Slot = { startsAt: string; endsAt: string };

/**
 * Calcula los huecos libres de una BookingPage para un día concreto.
 * availability: { "1": ["09:00","17:00"], ... } — 1=lunes ISO.
 */
export async function getAvailableSlots(pageId: string, date: Date): Promise<Slot[]> {
  const page = await prisma.bookingPage.findUnique({ where: { id: pageId } });
  if (!page || !page.active) return [];

  const availability = page.availability as Record<string, [string, string]>;
  // ISO weekday: lunes=1 ... domingo=7
  const jsDay = date.getDay(); // 0=domingo
  const isoDay = jsDay === 0 ? 7 : jsDay;
  const window = availability[String(isoDay)];
  if (!window) return [];

  const [startHM, endHM] = window;
  const [sh, sm] = startHM.split(':').map(Number);
  const [eh, em] = endHM.split(':').map(Number);

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh, sm);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh, em);
  const now = new Date();

  // Reservas existentes del día
  const existing = await prisma.booking.findMany({
    where: {
      bookingPageId: pageId,
      status: 'CONFIRMED',
      startsAt: { gte: dayStart, lt: new Date(dayEnd.getTime() + 24 * 3600 * 1000) },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slotMs = page.durationMinutes * 60 * 1000;
  const stepMs = (page.durationMinutes + page.bufferMinutes) * 60 * 1000;
  const slots: Slot[] = [];

  for (let t = dayStart.getTime(); t + slotMs <= dayEnd.getTime(); t += stepMs) {
    const s = new Date(t);
    const e = new Date(t + slotMs);
    if (s <= now) continue; // no reservar en el pasado
    const overlaps = existing.some((b) => s < b.endsAt && e > b.startsAt);
    if (!overlaps) slots.push({ startsAt: s.toISOString(), endsAt: e.toISOString() });
  }
  return slots;
}
