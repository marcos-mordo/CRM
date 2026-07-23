'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { TaskPriority, TaskStatus } from '@prisma/client';

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
});

export async function createTask(input: z.infer<typeof taskSchema>) {
  const session = await requireAuth();
  const parsed = taskSchema.parse(input);
  await prisma.task.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority ?? 'MEDIUM',
      status: parsed.status ?? 'PENDING',
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      assigneeId: parsed.assigneeId || session.user.id,
      creatorId: session.user.id,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      leadId: parsed.leadId || null,
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/tasks');
  return { ok: true };
}

export async function updateTask(id: string, input: Partial<z.infer<typeof taskSchema>>) {
  const session = await requireAuth();
  const data: any = { ...input };
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.assigneeId === '') data.assigneeId = null;

  await prisma.task.update({
    where: { id, organizationId: session.user.organizationId },
    data,
  });
  revalidatePath('/tasks');
  return { ok: true };
}

export async function toggleTaskStatus(id: string) {
  const session = await requireAuth();
  const task = await prisma.task.findUniqueOrThrow({
    where: { id, organizationId: session.user.organizationId },
  });
  const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
  await prisma.task.update({
    where: { id },
    data: {
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date() : null,
    },
  });
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  revalidatePath('/my-day');
  return { ok: true };
}

export async function deleteTask(id: string) {
  const session = await requireAuth();
  await prisma.task.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/tasks');
  return { ok: true };
}
