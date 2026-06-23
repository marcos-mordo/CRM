import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

interface AuditInput {
  action: AuditAction;
  organizationId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const h = await headers().catch(() => null);
    const ip = h?.get('x-forwarded-for')?.split(',')[0].trim() ?? h?.get('x-real-ip') ?? null;
    const userAgent = h?.get('user-agent') ?? null;

    await prisma.auditLog.create({
      data: {
        action: input.action,
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorRole: input.actorRole ?? null,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
        ip,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to log', input.action, err);
    // never throw - auditing failures must not break the user action
  }
}
