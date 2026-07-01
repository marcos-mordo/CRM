import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { NotificationPrefsForm } from '@/components/settings/notification-prefs-form';

export default async function NotificationsPrefsPage() {
  const session = await requireAuth();
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferencias de notificaciones"
        description="Elige cómo y cuándo quieres recibir avisos"
      />
      <NotificationPrefsForm
        initial={{
          emailDigest: prefs?.emailDigest ?? true,
          emailInstant: prefs?.emailInstant ?? false,
          pushEnabled: prefs?.pushEnabled ?? true,
          telegramEnabled: prefs?.telegramEnabled ?? false,
          events: (prefs?.events as Record<string, boolean>) ?? {},
        }}
      />
    </div>
  );
}
