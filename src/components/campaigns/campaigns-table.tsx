'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteCampaign, sendCampaign } from '@/app/(dashboard)/campaigns/actions';
import type { Campaign, CampaignStatus, CampaignList, EmailList, User } from '@prisma/client';

type Row = Campaign & { lists: (CampaignList & { list: EmailList })[]; createdBy: User };

const statusVariant: Record<CampaignStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'warning',
  SENDING: 'default',
  SENT: 'success',
  FAILED: 'destructive',
};

export function CampaignsTable({ campaigns }: { campaigns: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const send = (id: string) => {
    if (!confirm('¿Enviar campaña ahora?')) return;
    startTransition(async () => {
      try {
        const res = await sendCampaign(id);
        toast.success(`Enviado a ${res.sent} destinatarios${res.failed > 0 ? ` (${res.failed} fallaron)` : ''}`);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || 'Error al enviar');
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteCampaign(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Common.name')}</TableHead>
          <TableHead>{t('Campaigns.subject')}</TableHead>
          <TableHead>{t('Campaigns.lists')}</TableHead>
          <TableHead>{t('Common.status')}</TableHead>
          <TableHead className="text-right">{t('Campaigns.recipients')}</TableHead>
          <TableHead>{t('Common.date')}</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="text-sm">{c.subject}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {c.lists.map((l) => (
                  <Badge key={l.listId} variant="outline" className="text-xs">{l.list.name}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[c.status]}>{t(`Campaigns.status.${c.status}` as any)}</Badge>
            </TableCell>
            <TableCell className="text-right text-sm">
              {c.status === 'SENT' ? c.recipientsCount.toLocaleString() : '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {c.sentAt ? formatDate(c.sentAt) : formatDate(c.createdAt)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(c.status === 'DRAFT' || c.status === 'FAILED') && (
                    <DropdownMenuItem onClick={() => send(c.id)} disabled={isPending}>
                      <Send className="h-4 w-4" /> {t('Campaigns.send')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => remove(c.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
