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
import { CompanyDialog } from './company-dialog';
import { ColumnsMenu } from '@/components/ui/columns-menu';
import { useColumnPrefs } from '@/hooks/use-column-prefs';
import { Building2, Edit, ExternalLink, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { deleteCompany } from '@/app/(dashboard)/companies/actions';
import type { Company } from '@prisma/client';

type Row = Company & { _count: { contacts: number; deals: number } };

export function CompaniesTable({ companies, customFields = { fields: [], valuesByRow: {} } }: { companies: Row[]; customFields?: { fields: { key: string; label: string }[]; valuesByRow: Record<string, Record<string, string>> } }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [, startTransition] = useTransition();

  const COLUMNS: { key: string; label: string; cell: (c: Row) => React.ReactNode }[] = [
    { key: 'name', label: t('Common.name'), cell: (c) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
        <div>
          <p className="font-medium">{c.name}</p>
          {c.website && (
            <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              {c.website}<ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    ) },
    { key: 'industry', label: t('Companies.industry'), cell: (c) => <span className="text-sm">{c.industry || '—'}</span> },
    { key: 'size', label: t('Companies.size'), cell: (c) => <span className="text-sm">{c.size || '—'}</span> },
    { key: 'city', label: 'Ciudad', cell: (c) => <span className="text-sm">{c.city || '—'}</span> },
    { key: 'contacts', label: 'Contactos', cell: (c) => <Badge variant="secondary">{c._count.contacts}</Badge> },
    { key: 'deals', label: 'Oportunidades', cell: (c) => <Badge variant="secondary">{c._count.deals}</Badge> },
    { key: 'revenue', label: t('Companies.annualRevenue'), cell: (c) => <span className="text-sm">{c.annualRevenue ? formatCurrency(Number(c.annualRevenue)) : '—'}</span> },
    ...customFields.fields.map((f) => ({
      key: `cf_${f.key}`,
      label: f.label,
      cell: (c: Row) => <span className="text-sm">{customFields.valuesByRow[c.id]?.[f.key] || '—'}</span>,
    })),
  ];
  const builtInKeys = COLUMNS.filter((c) => !c.key.startsWith('cf_')).map((c) => c.key);
  const allKeys = COLUMNS.map((c) => c.key);
  const { visible, hydrated, toggle, move, reset } = useColumnPrefs('cols.companies.v1', allKeys, builtInKeys);
  const cols = (hydrated ? visible : builtInKeys).map((k) => COLUMNS.find((c) => c.key === k)!).filter(Boolean);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q)
    );
  }, [companies, search]);

  const handleDelete = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      try {
        await deleteCompany(id);
        toast.success(t('Common.deleted'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('Common.search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ColumnsMenu columns={COLUMNS.map((c) => ({ key: c.key, label: c.label }))} visible={cols.map((c) => c.key)} onToggle={toggle} onMove={move} onReset={reset} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => setEditing(c)}>
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
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && <CompanyDialog company={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
