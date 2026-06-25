import crypto from 'node:crypto';

const PREFIX = 'shr_';

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? 'change-me-please';
}

/**
 * Genera un token compartible a partir de un saleId. El token es
 * determinista (mismo saleId → mismo token), pero requiere conocer
 * NEXTAUTH_SECRET para forjarlo.
 *
 * Para revocar un link basta con rotar NEXTAUTH_SECRET (todos los
 * links viejos quedan inválidos). Si necesitas revocación granular,
 * crea una tabla SaleShareToken con activable/expirable.
 */
export function generateShareToken(saleId: string): string {
  const hmac = crypto.createHmac('sha256', getSecret()).update(`sale:${saleId}`).digest('base64url');
  return `${PREFIX}${saleId}.${hmac.slice(0, 22)}`;
}

export function verifyShareToken(token: string): string | null {
  if (!token.startsWith(PREFIX)) return null;
  const stripped = token.slice(PREFIX.length);
  const [saleId, sig] = stripped.split('.');
  if (!saleId || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(`sale:${saleId}`).digest('base64url').slice(0, 22);
  if (sig !== expected) return null;
  return saleId;
}
