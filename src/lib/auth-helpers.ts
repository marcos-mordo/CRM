import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { resolveCurrentOrg } from '@/lib/current-org';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Resolver org actual desde cookie (si el usuario cambió de organización)
  const userAny = session.user as any;
  try {
    const resolved = await resolveCurrentOrg(
      userAny.id,
      userAny.organizationId,
      userAny.role
    );
    // Sobreescribimos la sesión en memoria con la org activa
    (session.user as any).organizationId = resolved.organizationId;
    (session.user as any).organizationName = resolved.organizationName;
    (session.user as any).organizationSlug = resolved.organizationSlug;
    (session.user as any).role = resolved.role;
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
