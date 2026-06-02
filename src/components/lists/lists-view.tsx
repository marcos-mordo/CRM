'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { List as ListIcon, Plus, Trash2, UserMinus, Users, X } from 'lucide-react';
import { addContactsToList, deleteList, removeContactFromList } from '@/app/(dashboard)/lists/actions';
import type { Contact, EmailList, EmailListMember } from '@prisma/client';

type ListRow = EmailList & {
  _count: { members: number };
  members: (EmailListMember & { contact: Contact })[];
};

export function ListsView({ lists, contacts }: { lists: ListRow[]; contacts: Contact[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState<ListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const availableContacts = adding
    ? contacts.filter(
        (c) =>
          !adding.members.some((m) => m.contactId === c.id) &&
          (search ? (c.firstName + ' ' + c.lastName + ' ' + c.email).toLowerCase().includes(search.toLowerCase()) : true)
      )
    : [];

  const removeList = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteList(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  const addSelected = () => {
    if (!adding || selectedIds.length === 0) return;
    startTransition(async () => {
      await addContactsToList(adding.id, selectedIds);
      toast.success(`${selectedIds.length} contactos añadidos`);
      setAdding(null);
      setSelectedIds([]);
      setSearch('');
      router.refresh();
    });
  };

  const removeMember = (listId: string, contactId: string) => {
    startTransition(async () => {
      await removeContactFromList(listId, contactId);
      router.refresh();
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <Card key={list.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListIcon className="h-4 w-4" />
                    {list.name}
                  </CardTitle>
                  {list.description && (
                    <p className="text-xs text-muted-foreground mt-1">{list.description}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeList(list.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {list._count.members}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => { setAdding(list); setSearch(''); setSelectedIds([]); }}>
                  <Plus className="h-3.5 w-3.5" />
                  Añadir
                </Button>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {list.members.slice(0, 8).map((m) => (
                  <div key={m.contactId} className="flex items-center justify-between text-xs p-1.5 hover:bg-accent rounded">
                    <div>
                      <p className="font-medium">{m.contact.firstName} {m.contact.lastName}</p>
                      <p className="text-muted-foreground">{m.contact.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeMember(list.id, m.contactId)}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {list.members.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{list.members.length - 8} más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir contactos a "{adding?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
              {availableContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin contactos disponibles</p>
              ) : (
                availableContacts.map((c) => {
                  const sel = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? [...selectedIds, c.id] : selectedIds.filter((id) => id !== c.id))
                        }
                      />
                      <div>
                        <p className="font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdding(null)}>{t('Common.cancel')}</Button>
              <Button onClick={addSelected} disabled={selectedIds.length === 0}>
                Añadir {selectedIds.length > 0 && `(${selectedIds.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
