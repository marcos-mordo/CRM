'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { buildOtpauthUri, generateBackupCodes, generateSecret, hashBackupCode, verifyToken } from '@/lib/totp';

/**
 * Inicia setup de 2FA: genera secret y devuelve URI para QR.
 * El secret queda en DB pero con enabled=false hasta que el usuario
 * verifique con un código.
 */
export async function startTwoFactorSetup(): Promise<{ secret: string; otpauthUri: string }> {
  const session = await requireAuth();
  const secret = generateSecret();
  const otpauthUri = buildOtpauthUri(secret, session.user.email);

  await prisma.userTwoFactor.upsert({
    where: { userId: session.user.id },
    update: { secret, enabled: false, backupCodes: [] },
    create: { userId: session.user.id, secret, enabled: false, backupCodes: [] },
  });

  return { secret, otpauthUri };
}

export async function enableTwoFactor(token: string): Promise<{ ok: true; backupCodes: string[] }> {
  const session = await requireAuth();
  const tf = await prisma.userTwoFactor.findUnique({ where: { userId: session.user.id } });
  if (!tf) throw new Error('Primero inicia el setup de 2FA');

  if (!verifyToken(tf.secret, token)) {
    throw new Error('Código TOTP inválido. Verifica que la hora del dispositivo sea correcta.');
  }

  const { plain, hashes } = generateBackupCodes(10);

  await prisma.userTwoFactor.update({
    where: { userId: session.user.id },
    data: {
      enabled: true,
      enabledAt: new Date(),
      backupCodes: hashes,
    },
  });

  revalidatePath('/me/two-factor');
  return { ok: true, backupCodes: plain };
}

export async function disableTwoFactor(passwordOrCode: string): Promise<{ ok: true }> {
  const session = await requireAuth();
  const tf = await prisma.userTwoFactor.findUnique({ where: { userId: session.user.id } });
  if (!tf) throw new Error('No tienes 2FA configurado');

  // Para desactivar exigimos un código TOTP válido o un backup code
  const validTotp = verifyToken(tf.secret, passwordOrCode);
  const codeHash = hashBackupCode(passwordOrCode);
  const validBackup = tf.backupCodes.includes(codeHash);

  if (!validTotp && !validBackup) {
    throw new Error('Código inválido');
  }

  await prisma.userTwoFactor.delete({ where: { userId: session.user.id } });
  revalidatePath('/me/two-factor');
  return { ok: true };
}

export async function regenerateBackupCodes(token: string): Promise<{ ok: true; backupCodes: string[] }> {
  const session = await requireAuth();
  const tf = await prisma.userTwoFactor.findUnique({ where: { userId: session.user.id } });
  if (!tf || !tf.enabled) throw new Error('2FA no está habilitado');
  if (!verifyToken(tf.secret, token)) throw new Error('Código TOTP inválido');

  const { plain, hashes } = generateBackupCodes(10);
  await prisma.userTwoFactor.update({
    where: { userId: session.user.id },
    data: { backupCodes: hashes },
  });
  revalidatePath('/me/two-factor');
  return { ok: true, backupCodes: plain };
}
