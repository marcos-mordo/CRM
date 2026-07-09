'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SlaBadge } from '@/components/tickets/sla-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteTicket, updateTicket } from '@/app/(dashboard)/tickets/actions';
import type { Contact, Ticket, TicketPriority, TicketStatus, User } from '@prisma/client';

type Row = Ticket & { contact: Contact | null; agent: User | null; _count: { comments: number } };

const statusVariant: Record<TicketStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  WAITING: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'outline',
};

const priorityVariant: Record<TicketPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export function TicketsTable({ tickets, users, sla = {} }: { tickets: Row[]; users: User[]; sla?: Record<string, import('@/lib/sla').SlaEvaluation> }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('OPEN');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      if (filter !== 'ALL' && tk.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return tk.subject.toLowerCase().includes(q) || tk.contact?.firstName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, search, filter]);

  const update = (id: string, data: any) => {
    startTransition(async () => {
      await updateTicket(id, data);
      toast.success(t('Common.saved'));
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteTicket(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <>
      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('Common.search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
              {s === 'ALL' ? t('Common.all') : t(`Tickets.status.${s}` as any)}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t('Tickets.subject')}</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>{t('Tickets.agent')}</TableHead>
            <TableHead>{t('Common.date')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((tk) => (
            <TableRow key={tk.id}>
              <TableCell className="font-mono text-sm">#{tk.number}</TableCell>
              <TableCell>
                <Link href={`/tickets/${tk.id}`} className="font-medium hover:underline">
                  {tk.subject}
                </Link>
                {tk._count.comments > 0 && (
                  <Badge variant="outline" className="ml-2 gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {tk._count.comments}
                  </Badge>
                )}
                {sla[tk.id] && <span className="ml-2 inline-block"><SlaBadge sla={sla[tk.id]} /></span>}
              </TableCell>
              <TableCell className="text-sm">
                {tk.contact ? `${tk.contact.firstName} ${tk.contact.lastName}` : '—'}
              </TableCell>
              <TableCell>
                <Badge className={`border-transparent text-xs ${priorityVariant[tk.priority]}`}>
                  {t(`Tickets.priorities.${tk.priority}` as any)}
                </Badge>
              </TableCell>
              <TableCell>
                <Select value={tk.status} onValueChange={(v) => update(tk.id, { status: v })}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">{t('Tickets.status.OPEN')}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t('Tickets.status.IN_PROGRESS')}</SelectItem>
                    <SelectItem value="WAITING">{t('Tickets.status.WAITING')}</SelectItem>
                    <SelectItem value="RESOLVED">{t('Tickets.status.RESOLVED')}</SelectItem>
                    <SelectItem value="CLOSED">{t('Tickets.status.CLOSED')}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-sm">{tk.agent?.name || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(tk.createdAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/tickets/${tk.id}`}>Ver detalle</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(tk.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
