import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { resolveCurrentOrg } from '@/lib/current-org';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userAny = session.user as any;

  // OAuth: el JWT solo trae email — hidratamos desde DB
  if (!userAny.id && session.user.email) {
    const { prisma } = await import('@/lib/prisma');
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });
    if (!dbUser) redirect('/login');
    userAny.id = dbUser.id;
    userAny.role = dbUser.role;
    userAny.organizationId = dbUser.organizationId;
    userAny.organizationName = dbUser.organization.name;
    userAny.organizationSlug = dbUser.organization.slug;
    session.user.name = dbUser.name;
  }

  // Resolver org actual desde cookie (si el usuario cambió de organización)
  try {
    const resolved = await resolveCurrentOrg(
      userAny.id,
      userAny.organizationId,
      userAny.role
    );
    userAny.organizationId = resolved.organizationId;
    userAny.organizationName = resolved.organizationName;
    userAny.organizationSlug = resolved.organizationSlug;
    userAny.role = resolved.role;
  } catch {
    // Si falla la resolución, mantenemos lo que vino del JWT
  }

  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect('/dashboard');
  }
  return session;
}

export async function getOrgId() {
  const session = await requireAuth();
  return session.user.organizationId;
}

export function canManage(role: Role) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

export function isAdmin(role: Role) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canWrite(role: Role) {
  // VIEWER es solo lectura — todos los demás pueden escribir
  return role !== 'VIEWER';
}

export async function requireWrite() {
  const session = await requireAuth();
  if (!canWrite(session.user.role)) {
    throw new Error('Tu rol VIEWER es de solo lectura. Pide a un admin permisos para esta acción.');
  }
  return session;
}
