import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { CalendarView } from '@/components/calendar/calendar-view';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await requireAuth();
  const { month: monthParam, year: yearParam } = await searchParams;

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const [tasks, sales, deals] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: session.user.organizationId,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      include: { assignee: { select: { name: true } } },
    }),
    prisma.sale.findMany({
      where: {
        organizationId: session.user.organizationId,
        saleDate: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, number: true, total: true, currency: true, saleDate: true, status: true, brand: { select: { name: true } } },
    }),
    prisma.deal.findMany({
      where: {
        organizationId: session.user.organizationId,
        expectedCloseDate: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, title: true, amount: true, currency: true, expectedCloseDate: true, status: true },
    }),
  ]);

  const events = [
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      type: 'task' as const,
      title: t.title,
      date: t.dueDate!,
      meta: t.assignee?.name ?? '',
      priority: t.priority,
      href: '/tasks',
    })),
    ...sales.map((s) => ({
      id: `sale-${s.id}`,
      type: 'sale' as const,
      title: `${s.number} · ${s.brand.name}`,
      date: s.saleDate,
      meta: `${Number(s.total).toFixed(2)} ${s.currency}`,
      status: s.status,
      href: `/sales-orders/${s.id}`,
    })),
    ...deals.map((d) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: d.title,
      date: d.expectedCloseDate!,
      meta: `${Number(d.amount).toFixed(2)} ${d.currency}`,
      href: '/pipeline',
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario" description={`${events.length} eventos este mes`} />
      <Card>
        <CalendarView events={events} year={year} month={month} />
      </Card>
    </div>
  );
}
