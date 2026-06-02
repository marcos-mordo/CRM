import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { TicketCommentForm } from '@/components/tickets/ticket-comment-form';
import { formatDateTime } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const t = await getTranslations('Tickets');

  const ticket = await prisma.ticket.findUnique({
    where: { id, organizationId: session.user.organizationId },
    include: {
      contact: true,
      agent: true,
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!ticket) return notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`#${ticket.number} — ${ticket.subject}`}>
        <Button variant="outline" asChild>
          <Link href="/tickets">{t('title')}</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>
              ) : (
                ticket.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border ${c.internal ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900' : 'bg-card'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{c.authorName}</p>
                        {c.internal && (
                          <Badge variant="warning" className="gap-1 text-xs">
                            <Lock className="h-3 w-3" />
                            Nota interna
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
              <TicketCommentForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge>{t(`status.${ticket.status}` as any)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prioridad</p>
                <Badge variant="outline">{t(`priorities.${ticket.priority}` as any)}</Badge>
              </div>
              {ticket.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Categoría</p>
                  <p>{ticket.category}</p>
                </div>
              )}
              {ticket.contact && (
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p>{ticket.contact.firstName} {ticket.contact.lastName}</p>
                  {ticket.contact.email && <p className="text-xs text-muted-foreground">{ticket.contact.email}</p>}
                </div>
              )}
              {ticket.agent && (
                <div>
                  <p className="text-xs text-muted-foreground">Agente</p>
                  <p>{ticket.agent.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Creado</p>
                <p>{formatDateTime(ticket.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
