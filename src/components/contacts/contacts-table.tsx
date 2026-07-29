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
import { ColumnsMenu } from '@/components/ui/columns-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { FilterBar } from '@/components/ui/filter-bar';
import { FilteredExportButton } from '@/components/filtered-export-button';
import { SortableHead } from '@/components/ui/sortable-head';
import { useTableSort } from '@/hooks/use-table-sort';
import { sortRows } from '@/lib/sort-rows';
import { applyFilters, type FilterCondition, type FilterField, type FilterType } from '@/lib/table-filters';
import { useColumnPrefs } from '@/hooks/use-column-prefs';
import { ContactForm } from './contact-form';
import { BulkContactsBar } from './bulk-contacts-bar';
import { Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { initials, formatDate } from '@/lib/utils';
import { deleteContact } from '@/app/(dashboard)/contacts/actions';
import type { Contact, Company, User } from '@prisma/client';

type ContactRow = Contact & { company: Company | null; owner: User | null };

export function ContactsTable({
  contacts,
  companies,
  users,
  tags = [],
  customFields = { fields: [], valuesByRow: {} },
}: {
  contacts: ContactRow[];
  companies: Company[];
  users: User[];
  tags?: { id: string; name: string; color?: string }[];
  customFields?: { fields: { key: string; label: string }[]; valuesByRow: Record<string, Record<string, string>> };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [, startTransition] = useTransition();

  const toggleRow = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Filtros avanzados por columna (incluye campos personalizados como texto)
  const filterFields: FilterField[] = [
    { key: 'owner', label: t('Common.owner'), type: 'select', options: users.map((u) => ({ value: u.id, label: u.name })) },
    { key: 'company', label: t('Contacts.company'), type: 'select', options: companies.map((c) => ({ value: c.id, label: c.name })) },
    { key: 'city', label: 'Ciudad', type: 'text' },
    { key: 'country', label: 'País', type: 'text' },
    { key: 'jobTitle', label: 'Cargo', type: 'text' },
    { key: 'source', label: 'Origen', type: 'text' },
    { key: 'createdAt', label: t('Common.date'), type: 'date' },
    ...customFields.fields.map((f) => ({ key: `cf_${f.key}`, label: f.label, type: 'text' as FilterType })),
  ];
  const filterAccessors: Record<string, (c: ContactRow) => any> = {
    owner: (c) => c.ownerId, company: (c) => c.companyId, city: (c) => c.city,
    country: (c) => c.country, jobTitle: (c) => c.jobTitle, source: (c) => c.source, createdAt: (c) => c.createdAt,
    ...Object.fromEntries(customFields.fields.map((f) => [`cf_${f.key}`, (c: ContactRow) => customFields.valuesByRow[c.id]?.[f.key]])),
  };
  const filterTypes: Record<string, FilterType> = {
    owner: 'select', company: 'select', city: 'text', country: 'text', jobTitle: 'text', source: 'text', createdAt: 'date',
    ...Object.fromEntries(customFields.fields.map((f) => [`cf_${f.key}`, 'text' as FilterType])),
  };

  // Ordenación por columna
  const { sortKey, sortDir, toggle: toggleSort, setSort } = useTableSort();
  const sortAccessors: Record<string, (c: ContactRow) => any> = {
    name: (c) => `${c.firstName} ${c.lastName}`, company: (c) => c.company?.name, email: (c) => c.email,
    phone: (c) => c.phone, mobile: (c) => c.mobile, city: (c) => c.city, owner: (c) => c.owner?.name,
    date: (c) => new Date(c.updatedAt).getTime(),
    ...Object.fromEntries(customFields.fields.map((f) => [`cf_${f.key}`, (c: ContactRow) => customFields.valuesByRow[c.id]?.[f.key]])),
  };

  // Definición de columnas: etiqueta + cómo se renderiza cada celda.
  const COLUMNS: { key: string; label: string; cell: (c: ContactRow) => React.ReactNode; className?: string }[] = [
    {
      key: 'name', label: t('Common.name'),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(`${c.firstName} ${c.lastName}`)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{c.firstName} {c.lastName}</p>
            {c.jobTitle && <p className="text-xs text-muted-foreground">{c.jobTitle}</p>}
          </div>
        </div>
      ),
    },
    { key: 'company', label: t('Contacts.company'), cell: (c) => c.company ? <Badge variant="secondary">{c.company.name}</Badge> : <span className="text-muted-foreground text-sm">—</span> },
    { key: 'email', label: t('Common.email'), cell: (c) => <span className="text-sm">{c.email || '—'}</span> },
    { key: 'phone', label: t('Common.phone'), cell: (c) => <span className="text-sm">{c.phone || '—'}</span> },
    { key: 'mobile', label: 'Móvil', cell: (c) => <span className="text-sm">{c.mobile || '—'}</span> },
    { key: 'city', label: 'Ciudad', cell: (c) => <span className="text-sm">{c.city || '—'}</span> },
    { key: 'owner', label: t('Common.owner'), cell: (c) => <span className="text-sm">{c.owner?.name || '—'}</span> },
    { key: 'date', label: t('Common.date'), cell: (c) => <span className="text-sm text-muted-foreground">{formatDate(c.updatedAt)}</span> },
    // Campos personalizados (ocultos por defecto, disponibles en el menú)
    ...customFields.fields.map((f) => ({
      key: `cf_${f.key}`,
      label: f.label,
      cell: (c: ContactRow) => <span className="text-sm">{customFields.valuesByRow[c.id]?.[f.key] || '—'}</span>,
    })),
  ];
  const builtInKeys = COLUMNS.filter((c) => !c.key.startsWith('cf_')).map((c) => c.key);
  const allKeys = COLUMNS.map((c) => c.key);
  const { visible, hydrated, toggle, move, reset, views, saveView, applyView, deleteView } = useColumnPrefs('cols.contacts.v1', allKeys, builtInKeys, {
    capture: () => ({ filters, sortKey, sortDir }),
    restore: (e) => { setFilters(e?.filters ?? []); setSort(e?.sortKey ?? null, e?.sortDir ?? null); },
  });
  const cols = (hydrated ? visible : builtInKeys).map((k) => COLUMNS.find((c) => c.key === k)!).filter(Boolean);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const cfMatch = (id: string) => Object.values(customFields.valuesByRow[id] ?? {}).some((v) => String(v).toLowerCase().includes(q));
    const base = !search ? contacts : contacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.company?.name.toLowerCase().includes(q) ||
        cfMatch(c.id)
    );
    return applyFilters(base, filters, filterAccessors, filterTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, search, customFields, filters]);

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

  const sorted = useMemo(() => sortRows(filtered, sortKey ? sortAccessors[sortKey] : undefined, sortDir), [filtered, sortKey, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allSelected) filtered.forEach((c) => n.delete(c.id));
    else filtered.forEach((c) => n.add(c.id));
    return n;
  });

  return (
    <>
      {selected.size > 0 && (
        <BulkContactsBar ids={[...selected]} users={users} tags={tags} onClear={() => setSelected(new Set())} />
      )}
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Common.search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {filtered.length !== contacts.length && filtered.length > 0 && (
          <FilteredExportButton entity="contacts" ids={filtered.map((c) => c.id)} count={filtered.length} />
        )}
        <ColumnsMenu columns={COLUMNS.map((c) => ({ key: c.key, label: c.label }))} visible={cols.map((c) => c.key)} onToggle={toggle} onMove={move} onReset={reset} views={views} onSaveView={saveView} onApplyView={applyView} onDeleteView={deleteView} />
      </div>

      <div className="px-4 py-2 border-b">
        <FilterBar fields={filterFields} filters={filters} onChange={setFilters} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Seleccionar todo" /></TableHead>
            {cols.map((c) => (
              <TableHead key={c.key}>
                <SortableHead label={c.label} active={sortKey === c.key} dir={sortDir} sortable={!!sortAccessors[c.key]} onToggle={() => toggleSort(c.key)} />
              </TableHead>
            ))}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols.length + 2} className="text-center py-12 text-muted-foreground">
                {t('Common.noData')}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((c) => (
              <TableRow key={c.id} className={`cursor-pointer ${selected.has(c.id) ? 'bg-primary/5' : ''}`} onClick={() => setEditing(c)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleRow(c.id)} aria-label="Seleccionar" />
                </TableCell>
                {cols.map((col) => <TableCell key={col.key}>{col.cell(c)}</TableCell>)}
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
