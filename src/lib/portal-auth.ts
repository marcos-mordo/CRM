import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'brandhub_portal';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 días

export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export function generatePortalToken(): { plain: string; hash: string } {
  const plain = crypto.randomBytes(24).toString('base64url');
  return { plain, hash: hashToken(plain) };
}

export function signSessionToken(payload: { customerId: string; orgId: string; iat: number }): string {
  const secret = process.env.NEXTAUTH_SECRET ?? 'change-me';
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return Buffer.from(json).toString('base64url') + '.' + sig;
}

export function verifySessionToken(token: string): { customerId: string; orgId: string; iat: number } | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const json = Buffer.from(b64, 'base64url').toString();
    const secret = process.env.NEXTAUTH_SECRET ?? 'change-me';
    const expected = crypto.createHmac('sha256', secret).update(json).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(json);
    // Expiración 14 días
    if (Date.now() - payload.iat > COOKIE_MAX_AGE * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setPortalCookie(customerId: string, orgId: string) {
  const token = signSessionToken({ customerId, orgId, iat: Date.now() });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/portal',
  });
}

export async function readPortalCookie(): Promise<{ customerId: string; orgId: string } | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;
  return verifySessionToken(cookie.value);
}

export async function clearPortalCookie() {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path: '/portal' });
}

export async function requirePortalCustomer() {
  const session = await readPortalCookie();
  if (!session) return null;
  const customer = await prisma.endCustomer.findFirst({
    where: { id: session.customerId, organizationId: session.orgId, portalEnabled: true },
  });
  return customer;
}
