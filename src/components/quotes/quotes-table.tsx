'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowRightCircle, Download, Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { convertQuoteToInvoice, deleteQuote, updateQuoteStatus } from '@/app/(dashboard)/quotes/actions';
import type { Quote, QuoteStatus } from '@prisma/client';

const statusVariant: Record<QuoteStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  EXPIRED: 'warning',
};

export function QuotesTable({ quotes }: { quotes: Quote[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return quotes;
    const q = search.toLowerCase();
    return quotes.filter((x) => x.number.toLowerCase().includes(q) || x.customerName.toLowerCase().includes(q));
  }, [quotes, search]);

  const setStatus = (id: string, status: QuoteStatus) => {
    startTransition(async () => {
      await updateQuoteStatus(id, status);
      toast.success(t('Common.saved'));
      router.refresh();
    });
  };

  const convert = (id: string) => {
    startTransition(async () => {
      const res = await convertQuoteToInvoice(id);
      toast.success('Factura creada');
      router.push('/invoices');
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteQuote(id);
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
            <TableHead>{t('Quotes.number')}</TableHead>
            <TableHead>{t('Quotes.customer')}</TableHead>
            <TableHead>{t('Common.date')}</TableHead>
            <TableHead>{t('Quotes.validUntil')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            <TableHead className="text-right">{t('Common.total')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((q) => (
            <TableRow key={q.id}>
              <TableCell><code className="font-medium">{q.number}</code></TableCell>
              <TableCell>{q.customerName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(q.issueDate)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {q.validUntil ? formatDate(q.validUntil) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[q.status]}>{t(`Quotes.status.${q.status}` as any)}</Badge>
              </TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(Number(q.total), q.currency)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={`/api/quotes/${q.id}/pdf`} target="_blank">
                        <Download className="h-4 w-4" /> Descargar PDF
                      </a>
                    </DropdownMenuItem>
                    {q.status === 'DRAFT' && (
                      <DropdownMenuItem onClick={() => setStatus(q.id, 'SENT')}>
                        <ArrowRightCircle className="h-4 w-4" /> Marcar enviada
                      </DropdownMenuItem>
                    )}
                    {q.status === 'SENT' && (
                      <>
                        <DropdownMenuItem onClick={() => setStatus(q.id, 'ACCEPTED')}>
                          <Edit className="h-4 w-4" /> Aceptada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(q.id, 'REJECTED')}>
                          <Edit className="h-4 w-4" /> Rechazada
                        </DropdownMenuItem>
                      </>
                    )}
                    {(q.status === 'ACCEPTED' || q.status === 'SENT') && (
                      <DropdownMenuItem onClick={() => convert(q.id)}>
                        <ArrowRightCircle className="h-4 w-4" /> {t('Quotes.convertToInvoice')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => remove(q.id)} className="text-destructive">
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
