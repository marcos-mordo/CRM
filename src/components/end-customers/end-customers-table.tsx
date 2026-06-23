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
import { Building2, Edit, MoreHorizontal, Search, Trash2, User as UserIcon } from 'lucide-react';
import { EndCustomerDialog } from './end-customer-dialog';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { deleteEndCustomer } from '@/app/(dashboard)/end-customers/actions';
import type { EndCustomer } from '@prisma/client';

type Row = EndCustomer & { _count: { sales: number } };

export function EndCustomersTable({ customers }: { customers: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EndCustomer | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        (c.firstName ?? '').toLowerCase().includes(q) ||
        (c.lastName ?? '').toLowerCase().includes(q) ||
        (c.companyName ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.taxId ?? '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteEndCustomer(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('Common.search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>DNI/CIF</TableHead>
            <TableHead>{t('Common.email')}</TableHead>
            <TableHead>{t('Common.phone')}</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Ventas</TableHead>
            <TableHead>RGPD</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => setEditing(c)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
                    {c.isCompany ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {c.isCompany ? c.companyName : `${c.firstName} ${c.lastName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.isCompany ? 'Empresa' : 'Persona física'}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell><code className="text-xs">{c.taxId || '—'}</code></TableCell>
              <TableCell className="text-sm">{c.email || '—'}</TableCell>
              <TableCell className="text-sm">{c.mobile || c.phone || '—'}</TableCell>
              <TableCell className="text-sm">{c.city || '—'}</TableCell>
              <TableCell><Badge variant="secondary">{c._count.sales}</Badge></TableCell>
              <TableCell>
                {c.gdprConsent ? <Badge variant="success">✓</Badge> : <Badge variant="destructive">✗</Badge>}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <WhatsAppButton
                    phone={c.mobile || c.phone}
                    message={`Hola ${c.isCompany ? c.companyName : c.firstName}, te escribo desde nuestro equipo.`}
                    size="icon"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(c)}>
                        <Edit className="h-4 w-4" /> {t('Common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => remove(c.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && <EndCustomerDialog customer={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
