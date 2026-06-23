import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { AuditLogTable } from '@/components/audit-log/audit-log-table';
import type { AuditAction } from '@prisma/client';

const ACTIONS: AuditAction[] = [
  'USER_LOGIN', 'USER_INVITED', 'USER_DEACTIVATED', 'ROLE_CHANGED',
  'SALE_CREATED', 'SALE_SIGNED', 'SALE_CANCELLED', 'SALE_REFUNDED',
  'COMMISSION_APPROVED', 'COMMISSION_PAID',
  'TEMPLATE_CREATED', 'TEMPLATE_UPDATED', 'TEMPLATE_DELETED',
  'BRAND_CREATED', 'BRAND_DELETED',
  'CUSTOMERS_IMPORTED',
];

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; page?: string }>;
}) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect('/dashboard');

  const { action, actor, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  const where = {
    organizationId: session.user.organizationId,
    ...(action && ACTIONS.includes(action as AuditAction) ? { action: action as AuditAction } : {}),
    ...(actor ? { actorId: actor } : {}),
  };

  const [logs, total, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description={`${total} eventos · acción registrada por usuario, IP y fecha`}
      />

      <Card>
        <CardContent className="p-0">
          <AuditLogTable
            logs={logs}
            actors={actors}
            actions={ACTIONS}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            selectedAction={action}
            selectedActor={actor}
          />
        </CardContent>
      </Card>
    </div>
  );
}
