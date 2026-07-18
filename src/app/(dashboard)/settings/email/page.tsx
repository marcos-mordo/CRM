import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmailAccountManager } from '@/components/settings/email-account-manager';

export default async function EmailSettingsPage() {
  const session = await requireAuth();

  const [account, recentCount] = await Promise.all([
    prisma.emailAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.emailMessage.count({
      where: { organizationId: session.user.organizationId, account: { userId: session.user.id } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email conectado"
        description="Vincula tu buzón: el historial de emails aparece en cada contacto y puedes enviar desde el CRM"
      />
      <EmailAccountManager
        account={account ? {
          email: account.email,
          imapHost: account.imapHost,
          smtpHost: account.smtpHost,
          active: account.active,
          lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
          lastError: account.lastError,
        } : null}
        messageCount={recentCount}
      />
    </div>
  );
}
