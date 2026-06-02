import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
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
