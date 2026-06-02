'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContactForm } from './contact-form';
import { Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { initials, formatDate } from '@/lib/utils';
import { deleteContact } from '@/app/(dashboard)/contacts/actions';
import type { Contact, Company, User } from '@prisma/client';

type ContactRow = Contact & { company: Company | null; owner: User | null };

export function ContactsTable({
  contacts,
  companies,
  users,
}: {
  contacts: ContactRow[];
  companies: Company[];
  users: User[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.company?.name.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const handleDelete = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      try {
        await deleteContact(id);
        toast.success(t('Contacts.deleted'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Common.search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Common.name')}</TableHead>
            <TableHead>{t('Contacts.company')}</TableHead>
            <TableHead>{t('Common.email')}</TableHead>
            <TableHead>{t('Common.phone')}</TableHead>
            <TableHead>{t('Common.owner')}</TableHead>
            <TableHead>{t('Common.date')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                {t('Common.noData')}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setEditing(c)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials(`${c.firstName} ${c.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      {c.jobTitle && <p className="text-xs text-muted-foreground">{c.jobTitle}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {c.company ? <Badge variant="secondary">{c.company.name}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell className="text-sm">{c.email || '—'}</TableCell>
                <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                <TableCell className="text-sm">{c.owner?.name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(c)}>
                        <Edit className="h-4 w-4" />
                        {t('Common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                        {t('Common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Common.edit')} — {editing?.firstName} {editing?.lastName}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ContactForm
              contact={editing}
              companies={companies}
              users={users}
              onSuccess={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
