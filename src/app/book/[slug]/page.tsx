import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BookingWidget } from '@/components/booking/booking-widget';
import { BrandLogo } from '@/components/brand-logo';

export const metadata = { title: 'Reservar cita · BrandHub' };

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.bookingPage.findFirst({
    where: { slug, active: true },
    include: {
      user: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!page) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 p-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <BrandLogo size={56} className="mx-auto mb-3 rounded-xl shadow" />
          <h1 className="text-2xl font-bold">{page.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            con {page.user.name} · {page.organization.name} · {page.durationMinutes} min
          </p>
          {page.description && <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{page.description}</p>}
        </div>
        <BookingWidget slug={slug} durationMinutes={page.durationMinutes} />
      </div>
    </div>
  );
}
