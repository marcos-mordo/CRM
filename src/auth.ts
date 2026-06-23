import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authConfig } from '@/auth.config';
import { verifyToken, hashBackupCode } from '@/lib/totp';
import { slugify } from '@/lib/utils';

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

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

export const SSO_AVAILABLE = {
  google: googleConfigured,
  microsoft: microsoftConfigured,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user, account }) {
      if (!user.email || !account || account.provider === 'credentials') return;

      // OAuth login: si el user no existe en DB, lo creamos como OWNER de
      // una nueva organización con su nombre. Si existe, no tocamos nada.
      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (existing) {
        // Actualizar lastLoginAt
        await prisma.user.update({
          where: { id: existing.id },
          data: { lastLoginAt: new Date(), avatar: existing.avatar ?? user.image ?? null },
        });
        return;
      }

      // Crear organización + usuario
      const orgName = user.name ? `${user.name} Workspace` : 'Mi organización';
      let slug = slugify(orgName);
      let attempt = 0;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${slugify(orgName)}-${attempt}`;
      }

      // Password aleatorio (el user no lo va a usar, entra por SSO)
      const randomPwd = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      await prisma.organization.create({
        data: {
          name: orgName,
          slug,
          users: {
            create: {
              email: user.email,
              name: user.name ?? user.email.split('@')[0],
              password: randomPwd,
              avatar: user.image ?? null,
              role: 'OWNER',
              lastLoginAt: new Date(),
            },
          },
          pipelines: {
            create: {
              name: 'Pipeline principal',
              isDefault: true,
              stages: {
                create: [
                  { name: 'Nuevo', order: 0, probability: 10, color: '#94a3b8' },
                  { name: 'Contactado', order: 1, probability: 25, color: '#3b82f6' },
                  { name: 'Propuesta', order: 2, probability: 50, color: '#8b5cf6' },
                  { name: 'Negociación', order: 3, probability: 75, color: '#f59e0b' },
                  { name: 'Cerrado ganado', order: 4, probability: 100, color: '#10b981' },
                ],
              },
            },
          },
        },
      });
    },
  },
  providers: [
    ...(googleConfigured
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })]
      : []),
    ...(microsoftConfigured
      ? [MicrosoftEntraID({
          clientId: process.env.MICROSOFT_CLIENT_ID!,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
          // tenant 'common' permite tanto cuentas personales como work/school
          issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? 'common'}/v2.0`,
        })]
      : []),
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
