import crypto from 'node:crypto';

/**
 * Cifrado simétrico AES-256-GCM para secretos en DB (contraseñas IMAP…).
 * Clave derivada de NEXTAUTH_SECRET — rotarla invalida los secretos guardados
 * (el usuario tendría que reconectar su cuenta).
 */

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? 'change-me-please';
  return crypto.createHash('sha256').update(`${secret}:brandhub-secrets`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
