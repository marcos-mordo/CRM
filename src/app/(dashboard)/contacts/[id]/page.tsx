import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContactTimeline } from '@/components/contacts/contact-timeline';
import { AttachmentsPanel } from '@/components/attachments/attachments-panel';
import { ComposeEmailButton } from '@/components/contacts/compose-email-button';
import { LogActivityDialog } from '@/components/activities/log-activity-dialog';
import { Mail, Phone, Building2, Briefcase, Edit, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAuth();

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      company: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!contact) return notFound();

  // Cargar todas las interacciones en paralelo
  const [tasks, notes, deals, activities, attachments, emails, hasEmailAccount] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: session.user.organizationId, contactId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { assignee: { select: { name: true } } },
    }),
    prisma.note.findMany({
      where: { organizationId: session.user.organizationId, contacts: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { name: true } } },
    }),
    prisma.deal.findMany({
      where: { organizationId: session.user.organizationId, contactId: id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { stage: true, owner: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      where: { organizationId: session.user.organizationId, contactId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
    prisma.attachment.findMany({
      where: { organizationId: session.user.organizationId, contactId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, size: true, mimeType: true, type: true, createdAt: true, url: true },
    }),
    prisma.emailMessage.findMany({
      where: { organizationId: session.user.organizationId, contactId: id },
      orderBy: { sentAt: 'desc' },
      take: 50,
      select: { id: true, direction: true, fromAddr: true, toAddr: true, subject: true, snippet: true, sentAt: true },
    }),
    prisma.emailAccount.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`${contact.firstName} ${contact.lastName}`} description={contact.email || contact.phone || 'Sin contacto'}>
        {contact.phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${contact.phone}`}><Phone className="h-4 w-4" /> Llamar</a>
          </Button>
        )}
        {contact.email && (
          hasEmailAccount
            ? <ComposeEmailButton contactId={id} contactName={contact.firstName} contactEmail={contact.email} />
            : <Button asChild variant="outline" size="sm">
                <a href={`mailto:${contact.email}`}><Mail className="h-4 w-4" /> Email</a>
              </Button>
        )}
        {contact.phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        <LogActivityDialog contactId={id} />
        <Button asChild variant="default" size="sm">
          <Link href={`/contacts?edit=${id}`}><Edit className="h-4 w-4" /> Editar</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.jobTitle && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{contact.jobTitle}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <Link href={`/companies?id=${contact.companyId}`} className="hover:underline">
                    {contact.company.name}
                  </Link>
                </div>
              )}
              {contact.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <a href={`mailto:${contact.email}`} className="hover:underline break-all">{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Propietario</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {contact.owner?.name ?? '—'}
            </CardContent>
          </Card>

          <AttachmentsPanel entity="contact" entityId={id} initial={attachments} />

          {deals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Deals activos ({deals.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.slice(0, 5).map((d) => (
                  <Link key={d.id} href={`/pipeline?deal=${d.id}`} className="block text-xs p-2 border rounded hover:bg-accent">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-muted-foreground">{d.stage?.name} · {Number(d.amount ?? 0).toLocaleString('es-ES', { style: 'currency', currency: d.currency ?? 'EUR' })}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <ContactTimeline
            contactId={id}
            tasks={tasks}
            notes={notes}
            deals={deals}
            activities={activities}
            emails={emails}
          />
        </div>
      </div>
    </div>
  );
}
