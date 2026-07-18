'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { Role } from '@prisma/client';

const orgSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(80).optional(),
  website: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
});

export async function updateOrganization(input: z.infer<typeof orgSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = orgSchema.parse(input);

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: parsed,
  });
  revalidatePath('/settings');
  return { ok: true };
}

const salesIntelSchema = z.object({
  rottingDays: z.number().int().min(1).max(365),
  roundRobinEnabled: z.boolean(),
});

export async function updateSalesIntel(input: z.infer<typeof salesIntelSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = salesIntelSchema.parse(input);
  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { rottingDays: parsed.rottingDays, roundRobinEnabled: parsed.roundRobinEnabled },
  });
  revalidatePath('/settings');
  revalidatePath('/pipeline');
  return { ok: true };
}

const inviteSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.nativeEnum(Role),
  password: z.string().min(8),
});

export async function inviteUser(input: z.infer<typeof inviteSchema>) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const parsed = inviteSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new Error('Este correo ya está registrado');

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      password: await bcrypt.hash(parsed.password, 10),
      organizationId: session.user.organizationId,
    },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function toggleUserActive(userId: string) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  if (userId === session.user.id) throw new Error('No puedes desactivarte a ti mismo');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== session.user.organizationId) throw new Error('No autorizado');

  await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function changeUserRole(userId: string, role: Role) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('No autorizado');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== session.user.organizationId) throw new Error('No autorizado');
  if (user.role === 'OWNER' && session.user.role !== 'OWNER') throw new Error('No autorizado');

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/settings');
  return { ok: true };
}
