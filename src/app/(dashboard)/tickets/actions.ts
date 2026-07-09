'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { TicketPriority, TicketStatus } from '@prisma/client';

const ticketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.string().max(80).optional(),
  contactId: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
});

export async function createTicket(input: z.infer<typeof ticketSchema>) {
  const session = await requireAuth();
  const parsed = ticketSchema.parse(input);
  const count = await prisma.ticket.count({ where: { organizationId: session.user.organizationId } });

  const ticket = await prisma.ticket.create({
    data: {
      number: count + 1,
      subject: parsed.subject,
      description: parsed.description,
      priority: parsed.priority ?? 'MEDIUM',
      category: parsed.category,
      contactId: parsed.contactId || null,
      agentId: parsed.agentId || session.user.id,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/tickets');
  return { ok: true, id: ticket.id };
}

export async function updateTicket(id: string, data: Partial<{
  status: TicketStatus;
  priority: TicketPriority;
  agentId: string | null;
  category: string | null;
}>) {
  const session = await requireAuth();
  const update: any = { ...data };
  if (data.status === 'RESOLVED') update.resolvedAt = new Date();
  if (data.status === 'CLOSED') update.closedAt = new Date();

  await prisma.ticket.update({
    where: { id, organizationId: session.user.organizationId },
    data: update,
  });
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${id}`);
  return { ok: true };
}

export async function addComment(ticketId: string, content: string, internal: boolean) {
  const session = await requireAuth();
  await prisma.ticketComment.create({
    data: {
      ticketId,
      content,
      internal,
      authorName: session.user.name,
    },
  });

  // SLA: la primera respuesta pública de un agente marca firstResponseAt
  if (!internal) {
    await prisma.ticket.updateMany({
      where: { id: ticketId, organizationId: session.user.organizationId, firstResponseAt: null },
      data: { firstResponseAt: new Date() },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

// ===== SLA policies =====

export async function saveSlaPolicies(
  policies: { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; firstResponseMins: number; resolutionMins: number }[]
) {
  const session = await requireAuth();
  if (!['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Solo administradores');

  await Promise.all(
    policies.map((p) =>
      prisma.slaPolicy.upsert({
        where: { organizationId_priority: { organizationId: session.user.organizationId, priority: p.priority } },
        create: {
          organizationId: session.user.organizationId,
          priority: p.priority,
          firstResponseMins: Math.max(5, p.firstResponseMins),
          resolutionMins: Math.max(15, p.resolutionMins),
        },
        update: {
          firstResponseMins: Math.max(5, p.firstResponseMins),
          resolutionMins: Math.max(15, p.resolutionMins),
        },
      })
    )
  );
  revalidatePath('/tickets');
  return { ok: true };
}

export async function deleteTicket(id: string) {
  const session = await requireAuth();
  await prisma.ticket.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/tickets');
  return { ok: true };
}
