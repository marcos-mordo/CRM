import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Users, Merge } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { NewContactButton } from '@/components/contacts/new-contact-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function ContactsPage() {
  const session = await requireAuth();
  const t = await getTranslations('Contacts');

  const [contacts, companies, users] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: session.user.organizationId },
      include: { company: true, owner: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.company.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${contacts.length} contactos`}>
        <Button asChild variant="outline" size="sm">
          <Link href="/contacts/duplicates"><Merge className="h-4 w-4" /> Duplicados</Link>
        </Button>
        <NewContactButton companies={companies} users={users} />
      </PageHeader>

      <Card>
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('noContacts')}
            action={<NewContactButton companies={companies} users={users} />}
          />
        ) : (
          <ContactsTable contacts={contacts} companies={companies} users={users} />
        )}
      </Card>
    </div>
  );
}
