import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

const COOKIE_NAME = 'brandhub_org';

interface ResolvedOrg {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
}

/**
 * Resuelve la organización activa para un usuario:
 *  1. Si cookie brandhub_org existe y el user tiene membership válida → usa esa
 *  2. Si no, usa user.organizationId (org "default" del legacy schema)
 *  3. Si user tiene memberships pero ninguna coincide con el default, usa la primera activa
 *
 * Mantiene compatibilidad con sesiones existentes que ya guardan organizationId.
 */
export async function resolveCurrentOrg(userId: string, defaultOrgId: string, defaultRole: Role): Promise<ResolvedOrg> {
  const cookieStore = await cookies();
  const requested = cookieStore.get(COOKIE_NAME)?.value;

  // Caso 1: cookie con org distinta → validar membership
  if (requested && requested !== defaultOrgId) {
    const membership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId: requested } },
      include: { organization: true },
    });
    if (membership?.active) {
      return {
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        organizationSlug: membership.organization.slug,
        role: membership.role,
      };
    }
  }

  // Caso 2: default org (sesión legacy)
  const defaultOrg = await prisma.organization.findUnique({ where: { id: defaultOrgId } });
  if (defaultOrg) {
    return {
      organizationId: defaultOrg.id,
      organizationName: defaultOrg.name,
      organizationSlug: defaultOrg.slug,
      role: defaultRole,
    };
  }

  // Caso 3: user huérfano → primera membership activa
  const fallback = await prisma.organizationMembership.findFirst({
    where: { userId, active: true },
    include: { organization: true },
  });
  if (!fallback) throw new Error('Usuario sin organización activa');

  return {
    organizationId: fallback.organizationId,
    organizationName: fallback.organization.name,
    organizationSlug: fallback.organization.slug,
    role: fallback.role,
  };
}

export async function switchOrganization(userId: string, organizationId: string): Promise<void> {
  const cookieStore = await cookies();

  // Verificar que el usuario tiene membership (o es la default)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
  const isDefault = user?.organizationId === organizationId;
  const membership = isDefault
    ? true
    : await prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      });

  if (!membership) throw new Error('No tienes acceso a esa organización');

  cookieStore.set(COOKIE_NAME, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function listMyOrganizations(userId: string, defaultOrgId: string) {
  const [memberships, defaultOrg] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { userId, active: true },
      include: { organization: true },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.organization.findUnique({ where: { id: defaultOrgId } }),
  ]);

  const map = new Map<string, { id: string; name: string; slug: string; role: Role; isDefault: boolean }>();
  if (defaultOrg) {
    map.set(defaultOrg.id, { id: defaultOrg.id, name: defaultOrg.name, slug: defaultOrg.slug, role: 'OWNER', isDefault: true });
  }
  for (const m of memberships) {
    if (!map.has(m.organizationId)) {
      map.set(m.organizationId, {
        id: m.organizationId,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        isDefault: false,
      });
    }
  }
  return Array.from(map.values());
}
