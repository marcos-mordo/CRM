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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { createBrandProduct, updateBrandProduct } from '@/app/(dashboard)/catalog/actions';
import type { Brand, BrandProduct } from '@prisma/client';

interface Props {
  product?: BrandProduct;
  brandId: string;
  brands: Brand[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const PRODUCT_TYPES = ['LICENSE', 'SAAS_SUBSCRIPTION', 'AUDIT', 'TRAINING', 'HARDWARE', 'MANAGED_SERVICE', 'SUPPORT', 'CONSULTANCY', 'CUSTOM'] as const;
const FREQUENCIES = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export function BrandProductDialog({ product, brandId, brands, open, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    brandId: product?.brandId ?? brandId,
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    type: product?.type ?? 'CUSTOM',
    billingFrequency: product?.billingFrequency ?? 'ONE_TIME',
    basePrice: product ? Number(product.basePrice) : 0,
    cost: product?.cost ? Number(product.cost) : null,
    taxRate: product ? Number(product.taxRate) : 21,
    currency: product?.currency ?? 'EUR',
    active: product?.active ?? true,
    commissionType: product?.commissionType ?? null,
    commissionValue: product?.commissionValue ? Number(product.commissionValue) : null,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (product) await updateBrandProduct(product.id, form as any);
        else await createBrandProduct(form as any);
        toast.success(t('Common.saved'));
        onOpenChange(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? t('Common.edit') : t('BrandProducts.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Select value={form.brandId} onValueChange={(v) => set('brandId', v)} disabled={!!product}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('BrandProducts.type')}</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>{t(`BrandProducts.types.${p}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t('BrandProducts.basePrice')} *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => set('basePrice', Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Costo</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost ?? ''}
                onChange={(e) => set('cost', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>IVA %</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => set('taxRate', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('BrandProducts.billingFrequency')}</Label>
            <Select value={form.billingFrequency} onValueChange={(v) => set('billingFrequency', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>{t(`BrandProducts.frequencies.${f}` as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">Comisión específica (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Si lo dejas vacío, hereda la de la marca.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={form.commissionType ?? '_inherit'}
                  onValueChange={(v) => set('commissionType', v === '_inherit' ? null : (v as any))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_inherit">— Heredar de marca —</SelectItem>
                    <SelectItem value="PERCENTAGE">% sobre venta</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Cantidad fija</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.commissionValue ?? ''}
                  disabled={form.commissionType === null}
                  onChange={(e) => set('commissionValue', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Producto activo
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Common.cancel')}</Button>
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
