'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle2, Download, MoreHorizontal, Search, Send, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteInvoice, registerPayment, updateInvoiceStatus } from '@/app/(dashboard)/invoices/actions';
import type { Invoice, InvoiceStatus } from '@prisma/client';

const statusVariant: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  PARTIAL: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
};

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Transferencia');
  const [payRef, setPayRef] = useState('');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((x) => x.number.toLowerCase().includes(q) || x.customerName.toLowerCase().includes(q));
  }, [invoices, search]);

  const setStatus = (id: string, status: InvoiceStatus) => {
    startTransition(async () => {
      await updateInvoiceStatus(id, status);
      toast.success(t('Common.saved'));
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteInvoice(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    const amount = Number(payAmount);
    if (amount <= 0) return toast.error('Monto inválido');
    startTransition(async () => {
      try {
        await registerPayment(paying.id, amount, payMethod, payRef);
        toast.success('Pago registrado');
        setPaying(null);
        setPayAmount('');
        setPayRef('');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
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
            <TableHead>{t('Invoices.number')}</TableHead>
            <TableHead>{t('Invoices.customer')}</TableHead>
            <TableHead>{t('Invoices.issueDate')}</TableHead>
            <TableHead>{t('Invoices.dueDate')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            <TableHead className="text-right">{t('Invoices.amountPaid')}</TableHead>
            <TableHead className="text-right">{t('Invoices.balance')}</TableHead>
            <TableHead className="text-right">{t('Common.total')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((inv) => {
            const balance = Number(inv.total) - Number(inv.amountPaid);
            const isOverdue = new Date(inv.dueDate) < new Date() && balance > 0 && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
            return (
              <TableRow key={inv.id}>
                <TableCell><code className="font-medium">{inv.number}</code></TableCell>
                <TableCell>{inv.customerName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                <TableCell className={`text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formatDate(inv.dueDate)}
                </TableCell>
                <TableCell>
                  <Badge variant={isOverdue ? 'destructive' : statusVariant[inv.status]}>
                    {isOverdue && inv.status !== 'PAID' ? 'VENCIDA' : t(`Invoices.status.${inv.status}` as any)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(Number(inv.amountPaid), inv.currency)}</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {balance > 0 ? formatCurrency(balance, inv.currency) : <span className="text-green-600">—</span>}
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(Number(inv.total), inv.currency)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank">
                          <Download className="h-4 w-4" /> Descargar PDF
                        </a>
                      </DropdownMenuItem>
                      {inv.status === 'DRAFT' && (
                        <DropdownMenuItem onClick={() => setStatus(inv.id, 'SENT')}>
                          <Send className="h-4 w-4" /> Marcar enviada
                        </DropdownMenuItem>
                      )}
                      {balance > 0 && inv.status !== 'CANCELLED' && (
                        <DropdownMenuItem onClick={() => { setPaying(inv); setPayAmount(String(balance)); }}>
                          <CheckCircle2 className="h-4 w-4" /> {t('Invoices.registerPayment')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => remove(inv.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago — {paying?.number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Referencia / Folio</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>{t('Common.cancel')}</Button>
              <Button type="submit">Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
