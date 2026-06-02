'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { createProduct, updateProduct } from '@/app/(dashboard)/products/actions';
import type { Product } from '@prisma/client';

interface Props {
  product?: Product;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function ProductDialog({ product, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    price: product ? Number(product.price) : 0,
    cost: product?.cost ? Number(product.cost) : null,
    taxRate: product ? Number(product.taxRate) : 16,
    unit: product?.unit ?? 'unit',
    stock: product?.stock ?? null,
    active: product?.active ?? true,
  });

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (product) await updateProduct(product.id, form);
        else await createProduct(form);
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
      {!product && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('Products.new')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? t('Common.edit') : t('Products.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Products.sku')} *</Label>
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t('Common.name')} *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Products.category')}</Label>
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Products.unit')}</Label>
              <Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="unit, kg, hora..." />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Products.price')} *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', Number(e.target.value))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Products.cost')}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost ?? ''}
                onChange={(e) => set('cost', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Products.taxRate')}</Label>
              <Input type="number" step="0.01" value={form.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Products.stock')}</Label>
              <Input
                type="number"
                value={form.stock ?? ''}
                onChange={(e) => set('stock', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Producto activo
          </label>

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
