import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authConfig } from '@/auth.config';
import { verifyToken, hashBackupCode } from '@/lib/totp';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totp: z.string().optional(),
});

export class TwoFactorRequired extends CredentialsSignin {
  code = 'two_factor_required';
}
export class TwoFactorInvalid extends CredentialsSignin {
  code = 'two_factor_invalid';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: '2FA code', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { organization: true, twoFactor: true },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        if (user.twoFactor?.enabled) {
          const provided = parsed.data.totp?.trim();
          if (!provided) {
            throw new TwoFactorRequired();
          }
          // Acepta TOTP de 6 dígitos o backup code
          const validTotp = /^\d{6}$/.test(provided.replace(/\s/g, ''))
            && verifyToken(user.twoFactor.secret, provided);
          let validBackup = false;
          if (!validTotp) {
            const hash = hashBackupCode(provided);
            if (user.twoFactor.backupCodes.includes(hash)) {
              validBackup = true;
              // Consumir el backup code (quitar de la lista)
              await prisma.userTwoFactor.update({
                where: { userId: user.id },
                data: {
                  backupCodes: user.twoFactor.backupCodes.filter((b) => b !== hash),
                  lastUsedAt: new Date(),
                },
              });
            }
          } else {
            await prisma.userTwoFactor.update({
              where: { userId: user.id },
              data: { lastUsedAt: new Date() },
            });
          }
          if (!validTotp && !validBackup) {
            throw new TwoFactorInvalid();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          organizationSlug: user.organization.slug,
        };
      },
    }),
  ],
});
