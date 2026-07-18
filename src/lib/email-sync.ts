import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { decryptSecret } from './crypto';

/**
 * Sync de email 2-way por usuario vía IMAP/SMTP (app passwords).
 * - syncEmailAccount: baja los mensajes nuevos del INBOX y los vincula
 *   a contactos por dirección
 * - sendEmailFromAccount: envía por el SMTP del usuario y lo registra
 */

export function detectProvider(email: string): { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number } | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 };
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.es', 'hotmail.es'].includes(domain)) {
    return { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587 };
  }
  if (['yahoo.com', 'yahoo.es'].includes(domain)) {
    return { imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465 };
  }
  return null;
}

/** Prueba credenciales IMAP sin guardar nada. Lanza si fallan. */
export async function testImapConnection(cfg: {
  imapHost: string; imapPort: number; username: string; password: string;
}): Promise<void> {
  const client = new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort,
    secure: true,
    auth: { user: cfg.username, pass: cfg.password },
    logger: false,
    socketTimeout: 15000,
  });
  await client.connect();
  await client.logout();
}

/** Sincroniza una cuenta: INBOX desde lastSyncAt (o 7 días la primera vez). */
export async function syncEmailAccount(accountId: string): Promise<{ imported: number; matched: number }> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account || !account.active) return { imported: 0, matched: 0 };

  const password = decryptSecret(account.passwordEnc);
  const since = account.lastSyncAt ?? new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: { user: account.username, pass: password },
    logger: false,
    socketTimeout: 30000,
  });

  let imported = 0;
  let matched = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch({ since }, { envelope: true, internalDate: true })) {
        const env = msg.envelope;
        if (!env) continue;
        const from = env.from?.[0]?.address?.toLowerCase() ?? '';
        const to = env.to?.map((a) => a.address).filter(Boolean).join(', ') ?? account.email;
        const messageId = env.messageId ?? `uid-${msg.uid}-${account.id}`;

        // Match contacto por remitente
        const contact = from
          ? await prisma.contact.findFirst({
              where: { organizationId: account.organizationId, email: { equals: from, mode: 'insensitive' } },
              select: { id: true },
            })
          : null;

        try {
          await prisma.emailMessage.create({
            data: {
              accountId: account.id,
              direction: 'IN',
              fromAddr: from,
              toAddr: to,
              subject: env.subject ?? '(sin asunto)',
              sentAt: env.date ?? msg.internalDate ?? new Date(),
              messageId,
              contactId: contact?.id ?? null,
              organizationId: account.organizationId,
            },
          });
          imported++;
          if (contact) matched++;
        } catch {
          // unique(accountId, messageId) → ya importado, ignorar
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });
  } catch (err: any) {
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastError: String(err?.message ?? err).slice(0, 500) },
    }).catch(() => null);
    throw err;
  }
  return { imported, matched };
}

/** Sincroniza todas las cuentas activas (cron / interval). */
export async function syncAllEmailAccounts(): Promise<{ accounts: number; imported: number }> {
  const accounts = await prisma.emailAccount.findMany({ where: { active: true }, select: { id: true } });
  let imported = 0;
  for (const a of accounts) {
    try {
      const r = await syncEmailAccount(a.id);
      imported += r.imported;
    } catch (err: any) {
      console.error('[email-sync]', a.id, err?.message);
    }
  }
  return { accounts: accounts.length, imported };
}

/** Envía un email por el SMTP del usuario y lo registra vinculado al contacto. */
export async function sendEmailFromAccount(
  accountId: string,
  input: { to: string; subject: string; html: string; contactId?: string | null }
): Promise<void> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Cuenta de email no conectada');
  const password = decryptSecret(account.passwordEnc);

  const transport = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: { user: account.username, pass: password },
  });

  const info = await transport.sendMail({
    from: account.email,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  await prisma.emailMessage.create({
    data: {
      accountId: account.id,
      direction: 'OUT',
      fromAddr: account.email,
      toAddr: input.to,
      subject: input.subject,
      snippet: input.html.replace(/<[^>]+>/g, ' ').slice(0, 300),
      sentAt: new Date(),
      messageId: info.messageId ?? null,
      contactId: input.contactId ?? null,
      organizationId: account.organizationId,
    },
  });
}
