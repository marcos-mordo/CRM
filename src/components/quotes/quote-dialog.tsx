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
import { createQuote } from '@/app/(dashboard)/quotes/actions';
import { LineItemsEditor, type LineItem } from './line-items-editor';
import type { Product } from '@prisma/client';

interface Props {
  products: Product[];
}

export function QuoteDialog({ products }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    validUntil: '',
    notes: '',
    terms: 'Cotización válida por 30 días. Precios en moneda local. Sujeto a disponibilidad.',
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
        await createQuote({
          ...form,
          lines: lines.filter((l) => l.description),
          validUntil: form.validUntil || null,
        });
        toast.success(t('Common.saved'));
        setOpen(false);
        router.refresh();
        setForm({
          customerName: '',
          customerEmail: '',
          customerAddress: '',
          validUntil: '',
          notes: '',
          terms: form.terms,
          currency: form.currency,
        });
        setLines([{ description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0, productId: null }]);
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
          {t('Quotes.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Quotes.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Quotes.customer')} *</Label>
              <Input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.email')}</Label>
              <Input type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dirección del cliente</Label>
            <Input value={form.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Quotes.validUntil')}</Label>
              <Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
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
            <Label>Términos y condiciones</Label>
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
