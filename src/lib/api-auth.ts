import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ApiTokenScope } from '@prisma/client';

export interface ApiAuthContext {
  organizationId: string;
  scopes: ApiTokenScope[];
  tokenId: string;
}

export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export function generateToken(): { plain: string; prefix: string; hash: string } {
  // 32 bytes hex = 64 chars; prefijo 'bh_' para identificar
  const random = crypto.randomBytes(32).toString('hex');
  const plain = `bh_${random}`;
  return {
    plain,
    prefix: plain.slice(0, 8),
    hash: hashToken(plain),
  };
}

/**
 * Autentica una request mediante Bearer token y comprueba que tiene
 * al menos uno de los scopes requeridos.
 * Devuelve NextResponse de error o el contexto válido.
 */
export async function authenticateApiRequest(
  req: NextRequest,
  requiredScopes: ApiTokenScope[]
): Promise<ApiAuthContext | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Missing Bearer token in Authorization header' },
      { status: 401 }
    );
  }

  const tokenPlain = match[1].trim();
  const hash = hashToken(tokenPlain);
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
  });

  if (!token) {
    return NextResponse.json({ error: 'unauthorized', message: 'Invalid token' }, { status: 401 });
  }
  if (token.revokedAt) {
    return NextResponse.json({ error: 'unauthorized', message: 'Token revoked' }, { status: 401 });
  }
  if (token.expiresAt && token.expiresAt < new Date()) {
    return NextResponse.json({ error: 'unauthorized', message: 'Token expired' }, { status: 401 });
  }

  const hasScope =
    token.scopes.includes('ADMIN_ALL') ||
    requiredScopes.some((s) => token.scopes.includes(s));

  if (!hasScope) {
    return NextResponse.json(
      { error: 'forbidden', message: `Token missing required scope: ${requiredScopes.join(' or ')}` },
      { status: 403 }
    );
  }

  // Actualizar lastUsedAt sin bloquear
  prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    organizationId: token.organizationId,
    scopes: token.scopes,
    tokenId: token.id,
  };
}
