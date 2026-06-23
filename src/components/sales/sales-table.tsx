'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle, Download, MoreHorizontal, RotateCcw, Search, Trash2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteSale, setSaleStatus } from '@/app/(dashboard)/sales-orders/actions';
import type { Brand, EndCustomer, Sale, SaleStatus, User } from '@prisma/client';

type Row = Sale & { brand: Brand; endCustomer: EndCustomer; representative: User };

const statusVariant: Record<SaleStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_SIGN: 'warning',
  SIGNED: 'default',
  ACTIVE: 'success',
  CANCELLED: 'outline',
  REFUNDED: 'destructive',
};

export function SalesTable({ sales }: { sales: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (filter !== 'ALL' && s.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const customerName = s.endCustomer.isCompany
          ? s.endCustomer.companyName ?? ''
          : `${s.endCustomer.firstName ?? ''} ${s.endCustomer.lastName ?? ''}`;
        return (
          s.number.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          s.brand.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sales, search, filter]);

  const setStatus = (id: string, status: SaleStatus) => {
    startTransition(async () => {
      try {
        await setSaleStatus(id, status);
        toast.success(t('Common.saved'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteSale(id);
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
          {(['ALL', 'DRAFT', 'PENDING_SIGN', 'SIGNED', 'ACTIVE', 'CANCELLED', 'REFUNDED'] as const).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
              {s === 'ALL' ? t('Common.all') : t(`Sales.status.${s}` as any)}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Sales.number')}</TableHead>
            <TableHead>{t('Sales.brand')}</TableHead>
            <TableHead>{t('Sales.customer')}</TableHead>
            <TableHead>{t('Sales.representative')}</TableHead>
            <TableHead>{t('Sales.saleDate')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            <TableHead className="text-right">{t('Sales.amount')}</TableHead>
            <TableHead className="text-right">{t('Sales.commission')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.id}>
              <TableCell><code className="font-medium">{s.number}</code></TableCell>
              <TableCell><Badge variant="secondary">{s.brand.name}</Badge></TableCell>
              <TableCell>
                <p className="font-medium">
                  {s.endCustomer.isCompany ? s.endCustomer.companyName : `${s.endCustomer.firstName} ${s.endCustomer.lastName}`}
                </p>
                <p className="text-xs text-muted-foreground">{s.endCustomer.taxId}</p>
              </TableCell>
              <TableCell className="text-sm">{s.representative.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(s.saleDate)}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[s.status]}>{t(`Sales.status.${s.status}` as any)}</Badge>
              </TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(Number(s.total), s.currency)}</TableCell>
              <TableCell className="text-right text-sm text-green-600 dark:text-green-400 font-semibold">
                {formatCurrency(Number(s.totalCommission), s.currency)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {s.signedPdfUrl ? (
                      <DropdownMenuItem asChild>
                        <a href={s.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" /> {t('Sales.downloadContract')}
                        </a>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <a href={`/api/sales/${s.id}/pdf`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" /> {t('Sales.downloadContract')}
                        </a>
                      </DropdownMenuItem>
                    )}
                    {s.status === 'SIGNED' && (
                      <DropdownMenuItem onClick={() => setStatus(s.id, 'ACTIVE')}>
                        <CheckCircle className="h-4 w-4 text-green-600" /> Activar
                      </DropdownMenuItem>
                    )}
                    {(s.status === 'DRAFT' || s.status === 'PENDING_SIGN') && (
                      <DropdownMenuItem onClick={() => setStatus(s.id, 'CANCELLED')}>
                        <XCircle className="h-4 w-4" /> Cancelar
                      </DropdownMenuItem>
                    )}
                    {s.status === 'ACTIVE' && (
                      <DropdownMenuItem onClick={() => setStatus(s.id, 'REFUNDED')}>
                        <RotateCcw className="h-4 w-4" /> Reembolsar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => remove(s.id)} className="text-destructive">
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
