import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgSettingsForm } from '@/components/settings/org-settings-form';
import { TeamSettings } from '@/components/settings/team-settings';
import { RepAssignmentsManager } from '@/components/settings/rep-assignments-manager';
import { WebhooksManager } from '@/components/settings/webhooks-manager';
import { ApiTokensManager } from '@/components/settings/api-tokens-manager';
import { TagsManager } from '@/components/settings/tags-manager';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Settings');

  const [org, users, brands, assignments, webhooks, apiTokens, tags] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.brand.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' },
    }),
    prisma.repBrandAssignment.findMany({
      where: { organizationId: session.user.organizationId },
    }),
    prisma.webhookEndpoint.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiToken.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tag.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />

      <Tabs defaultValue="organization">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="organization">{t('organization')}</TabsTrigger>
          <TabsTrigger value="team">{t('team')}</TabsTrigger>
          <TabsTrigger value="assignments">Reps ↔ Marcas</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-tokens">API tokens</TabsTrigger>
          <TabsTrigger value="tags">Etiquetas</TabsTrigger>
          <TabsTrigger value="billing" asChild>
            <Link href="/settings/billing">Billing</Link>
          </TabsTrigger>
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

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignación de representantes</CardTitle>
              <CardDescription>
                Marca con check qué representantes pueden vender cada marca. Opcionalmente sobrescribe la comisión de la marca para ese representante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RepAssignmentsManager users={users.filter((u) => u.active)} brands={brands.filter((b) => b.active)} assignments={assignments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhooksManager webhooks={webhooks} />
        </TabsContent>

        <TabsContent value="api-tokens" className="space-y-4">
          <ApiTokensManager tokens={apiTokens} />
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <TagsManager tags={tags} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
