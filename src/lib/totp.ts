import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';

const ISSUER = 'BrandHub';

export function generateSecret(): string {
  // 20 bytes random → 32 chars base32 RFC 4648 (OTP estándar)
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildOtpauthUri(secret: string, accountName: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

export function verifyToken(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  // window=1 = acepta el código actual y el inmediatamente anterior (clock skew)
  const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
  return delta !== null;
}

export function generateBackupCodes(n = 10): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < n; i++) {
    // 8 chars hex en 2 grupos: e.g. "a1b2-c3d4"
    const code = crypto.randomBytes(4).toString('hex');
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    plain.push(formatted);
    hashes.push(crypto.createHash('sha256').update(formatted).digest('hex'));
  }
  return { plain, hashes };
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}
