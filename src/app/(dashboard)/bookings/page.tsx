import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { BookingsManager } from '@/components/booking/bookings-manager';

export default async function BookingsPage() {
  const session = await requireAuth();

  const [page, upcoming] = await Promise.all([
    prisma.bookingPage.findFirst({
      where: { userId: session.user.id, organizationId: session.user.organizationId },
    }),
    prisma.booking.findMany({
      where: {
        organizationId: session.user.organizationId,
        bookingPage: { userId: session.user.id },
        startsAt: { gte: new Date() },
        status: 'CONFIRMED',
      },
      orderBy: { startsAt: 'asc' },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas de citas"
        description="Tu página pública de reservas: compártela y deja que los clientes elijan hueco"
      />
      <BookingsManager
        page={page ? {
          slug: page.slug,
          title: page.title,
          description: page.description,
          durationMinutes: page.durationMinutes,
          availability: page.availability as Record<string, [string, string]>,
          active: page.active,
        } : null}
        upcoming={upcoming.map((b) => ({
          id: b.id,
          name: b.name,
          email: b.email,
          phone: b.phone,
          notes: b.notes,
          startsAt: b.startsAt.toISOString(),
          endsAt: b.endsAt.toISOString(),
        }))}
      />
    </div>
  );
}
