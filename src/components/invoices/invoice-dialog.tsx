'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { createInvoice } from '@/app/(dashboard)/invoices/actions';
import { LineItemsEditor, type LineItem } from '@/components/quotes/line-items-editor';
import type { Product } from '@prisma/client';

export function InvoiceDialog({ products }: { products: Product[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dueDateDefault = new Date(); dueDateDefault.setDate(dueDateDefault.getDate() + 30);

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxId: '',
    dueDate: dueDateDefault.toISOString().slice(0, 10),
    notes: '',
    terms: 'Pago a 30 días. Transferencia bancaria o pago electrónico.',
    currency: 'USD',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0, productId: null },
  ]);

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || lines.every((l) => !l.description)) {
      toast.error('Agrega al menos una línea');
      return;
    }
    startTransition(async () => {
      try {
        await createInvoice({ ...form, lines: lines.filter((l) => l.description) });
        toast.success(t('Common.saved'));
        setOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t('Invoices.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Invoices.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Invoices.customer')} *</Label>
              <Input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.email')}</Label>
              <Input type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={form.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>RFC / NIT / CIF</Label>
              <Input value={form.customerTaxId} onChange={(e) => set('customerTaxId', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Invoices.dueDate')} *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="PEN">PEN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Líneas</Label>
            <LineItemsEditor lines={lines} onChange={setLines} products={products} currency={form.currency} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Términos</Label>
            <Textarea rows={2} value={form.terms} onChange={(e) => set('terms', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('Common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
