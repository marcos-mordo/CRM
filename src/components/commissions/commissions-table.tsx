'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { approveCommission, payCommission } from '@/app/(dashboard)/commissions/actions';
import type { Brand, Commission, CommissionStatus, EndCustomer, Sale, User } from '@prisma/client';

type Row = Commission & { sale: Sale & { brand: Brand; endCustomer: EndCustomer }; representative: User };

const statusVariant: Record<CommissionStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  PENDING: 'warning',
  APPROVED: 'default',
  PAID: 'success',
  CANCELLED: 'destructive',
};

export function CommissionsTable({ commissions, canManage }: { commissions: Row[]; canManage: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<string>('ALL');
  const [paying, setPaying] = useState<Row | null>(null);
  const [payMethod, setPayMethod] = useState('Transferencia');
  const [payRef, setPayRef] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (tab === 'ALL') return commissions;
    return commissions.filter((c) => c.status === tab);
  }, [commissions, tab]);

  const approve = (id: string) => {
    startTransition(async () => {
      try {
        await approveCommission(id);
        toast.success('Comisión aprobada');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    startTransition(async () => {
      try {
        await payCommission(paying.id, { method: payMethod, reference: payRef || undefined });
        toast.success('Comisión marcada como pagada');
        setPaying(null);
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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">{t('Common.all')}</TabsTrigger>
            <TabsTrigger value="PENDING">{t('Commissions.status.PENDING')}</TabsTrigger>
            <TabsTrigger value="APPROVED">{t('Commissions.status.APPROVED')}</TabsTrigger>
            <TabsTrigger value="PAID">{t('Commissions.status.PAID')}</TabsTrigger>
            <TabsTrigger value="CANCELLED">{t('Commissions.status.CANCELLED')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Commissions.sale')}</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>{t('Commissions.representative')}</TableHead>
            <TableHead>{t('Common.date')}</TableHead>
            <TableHead className="text-right">{t('Commissions.amount')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            {canManage && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell><code className="font-medium text-xs">{c.sale.number}</code></TableCell>
              <TableCell><Badge variant="secondary">{c.sale.brand.name}</Badge></TableCell>
              <TableCell className="text-sm">
                {c.sale.endCustomer.isCompany
                  ? c.sale.endCustomer.companyName
                  : `${c.sale.endCustomer.firstName} ${c.sale.endCustomer.lastName}`}
              </TableCell>
              <TableCell className="text-sm">{c.representative.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.paidAt ? `Pagada ${formatDate(c.paidAt)}` : formatDate(c.createdAt)}
              </TableCell>
              <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                {formatCurrency(Number(c.amount), c.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[c.status]}>{t(`Commissions.status.${c.status}` as any)}</Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  {c.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => approve(c.id)} disabled={isPending}>
                      <CheckCircle className="h-3.5 w-3.5" /> {t('Commissions.approve')}
                    </Button>
                  )}
                  {c.status === 'APPROVED' && (
                    <Button size="sm" onClick={() => setPaying(c)}>
                      <DollarSign className="h-3.5 w-3.5" /> {t('Commissions.pay')}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago de comisión</DialogTitle>
          </DialogHeader>
          {paying && (
            <form onSubmit={submitPayment} className="space-y-3">
              <div className="bg-muted/40 rounded p-3 text-sm">
                <p>{paying.representative.name}</p>
                <p className="font-bold text-base">{formatCurrency(Number(paying.amount), paying.currency)}</p>
                <p className="text-xs text-muted-foreground">Venta {paying.sale.number}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('Commissions.paymentMethod')} *</Label>
                <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Commissions.paymentReference')}</Label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPaying(null)}>{t('Common.cancel')}</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar pago
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
