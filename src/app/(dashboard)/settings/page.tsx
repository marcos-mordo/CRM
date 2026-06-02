import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgSettingsForm } from '@/components/settings/org-settings-form';
import { TeamSettings } from '@/components/settings/team-settings';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Settings');

  const [org, users] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">{t('organization')}</TabsTrigger>
          <TabsTrigger value="team">{t('team')}</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('general')}</CardTitle>
              <CardDescription>Información de tu organización</CardDescription>
            </CardHeader>
            <CardContent>
              <OrgSettingsForm organization={org} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamSettings users={users} currentUserId={session.user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
