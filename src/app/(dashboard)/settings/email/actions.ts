'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { encryptSecret } from '@/lib/crypto';
import { detectProvider, testImapConnection, syncEmailAccount, sendEmailFromAccount } from '@/lib/email-sync';

const connectSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(200),
  imapHost: z.string().max(120).optional(),
  imapPort: z.number().int().optional(),
  smtpHost: z.string().max(120).optional(),
  smtpPort: z.number().int().optional(),
});

export async function connectEmailAccount(input: z.infer<typeof connectSchema>) {
  const session = await requireAuth();
  const parsed = connectSchema.parse(input);

  const auto = detectProvider(parsed.email);
  const imapHost = parsed.imapHost || auto?.imapHost;
  const imapPort = parsed.imapPort || auto?.imapPort || 993;
  const smtpHost = parsed.smtpHost || auto?.smtpHost;
  const smtpPort = parsed.smtpPort || auto?.smtpPort || 465;

  if (!imapHost || !smtpHost) {
    throw new Error('Proveedor no reconocido. Rellena los servidores IMAP/SMTP manualmente.');
  }

  // Probar credenciales ANTES de guardar
  try {
    await testImapConnection({ imapHost, imapPort, username: parsed.email, password: parsed.password });
  } catch (err: any) {
    throw new Error(`No se pudo conectar: ${err.message}. Si usas Gmail/Outlook necesitas una "contraseña de aplicación" (no tu contraseña normal).`);
  }

  await prisma.emailAccount.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      email: parsed.email,
      imapHost, imapPort, smtpHost, smtpPort,
      username: parsed.email,
      passwordEnc: encryptSecret(parsed.password),
      organizationId: session.user.organizationId,
    },
    update: {
      email: parsed.email,
      imapHost, imapPort, smtpHost, smtpPort,
      username: parsed.email,
      passwordEnc: encryptSecret(parsed.password),
      active: true,
      lastError: null,
    },
  });

  revalidatePath('/settings/email');
  return { ok: true };
}

export async function disconnectEmailAccount() {
  const session = await requireAuth();
  await prisma.emailAccount.deleteMany({ where: { userId: session.user.id } });
  revalidatePath('/settings/email');
  return { ok: true };
}

export async function syncMyEmail() {
  const session = await requireAuth();
  const account = await prisma.emailAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) throw new Error('No tienes cuenta conectada');
  const r = await syncEmailAccount(account.id);
  revalidatePath('/settings/email');
  return { ok: true, ...r };
}

const sendSchema = z.object({
  contactId: z.string(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function sendContactEmail(input: z.infer<typeof sendSchema>) {
  const session = await requireAuth();
  const parsed = sendSchema.parse(input);

  const [account, contact] = await Promise.all([
    prisma.emailAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.contact.findFirst({
      where: { id: parsed.contactId, organizationId: session.user.organizationId },
      select: { id: true, email: true, firstName: true },
    }),
  ]);
  if (!account) throw new Error('Conecta tu email en Configuración → Email para enviar desde el CRM');
  if (!contact?.email) throw new Error('Este contacto no tiene email');

  await sendEmailFromAccount(account.id, {
    to: contact.email,
    subject: parsed.subject,
    html: `<p>${parsed.body.replace(/\n/g, '<br/>')}</p>`,
    contactId: contact.id,
  });

  revalidatePath(`/contacts/${contact.id}`);
  return { ok: true };
}
