'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LeadDialog } from './lead-dialog';
import { ArrowRightCircle, Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { convertLead, deleteLead } from '@/app/(dashboard)/leads/actions';
import type { Lead, LeadStatus, User } from '@prisma/client';

type Row = Lead & { owner: User | null };

const statusVariant: Record<LeadStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  QUALIFIED: 'warning',
  UNQUALIFIED: 'destructive',
  CONVERTED: 'success',
};

export function LeadsTable({ leads, users }: { leads: Row[]; users: User[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<Lead | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.firstName.toLowerCase().includes(q) ||
          l.lastName.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  const handleDelete = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      try {
        await deleteLead(id);
        toast.success(t('Common.deleted'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  const handleConvert = (id: string) => {
    startTransition(async () => {
      try {
        await convertLead(id);
        toast.success('Lead convertido a contacto');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
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
          {(['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL' ? t('Common.all') : t(`Leads.status.${s}` as any)}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Common.name')}</TableHead>
            <TableHead>{t('Contacts.company')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            <TableHead>{t('Leads.score')}</TableHead>
            <TableHead>{t('Leads.estimatedValue')}</TableHead>
            <TableHead>{t('Leads.source')}</TableHead>
            <TableHead>{t('Common.owner')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((l) => (
            <TableRow key={l.id} className="cursor-pointer" onClick={() => setEditing(l)}>
              <TableCell>
                <p className="font-medium">{l.firstName} {l.lastName}</p>
                {l.email && <p className="text-xs text-muted-foreground">{l.email}</p>}
              </TableCell>
              <TableCell className="text-sm">
                <p>{l.company || '—'}</p>
                {l.jobTitle && <p className="text-xs text-muted-foreground">{l.jobTitle}</p>}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[l.status]}>{t(`Leads.status.${l.status}` as any)}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${l.score}%` }} />
                  </div>
                  <span className="text-xs font-medium">{l.score}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm font-medium">
                {l.estimatedValue ? formatCurrency(Number(l.estimatedValue)) : '—'}
              </TableCell>
              <TableCell className="text-sm">{l.source || '—'}</TableCell>
              <TableCell className="text-sm">{l.owner?.name || '—'}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(l)}>
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    {l.status !== 'CONVERTED' && (
                      <DropdownMenuItem onClick={() => handleConvert(l.id)}>
                        <ArrowRightCircle className="h-4 w-4" /> {t('Leads.convert')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDelete(l.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && <LeadDialog lead={editing} users={users} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
