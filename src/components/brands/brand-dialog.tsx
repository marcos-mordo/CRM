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
import { createBrand, updateBrand } from '@/app/(dashboard)/brands/actions';
import type { Brand } from '@prisma/client';

interface Props {
  brand?: Brand;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function BrandDialog({ brand, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: brand?.name ?? '',
    legalName: brand?.legalName ?? '',
    taxId: brand?.taxId ?? '',
    description: brand?.description ?? '',
    logo: brand?.logo ?? '',
    website: brand?.website ?? '',
    contactPerson: brand?.contactPerson ?? '',
    contactEmail: brand?.contactEmail ?? '',
    contactPhone: brand?.contactPhone ?? '',
    active: brand?.active ?? true,
    defaultCommissionType: brand?.defaultCommissionType ?? 'PERCENTAGE',
    defaultCommissionValue: brand ? Number(brand.defaultCommissionValue) : 10,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (brand) await updateBrand(brand.id, form as any);
        else await createBrand(form as any);
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
      {!brand && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('Brands.new')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{brand ? t('Common.edit') : t('Brands.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Brands.name')} *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Brands.legalName')}</Label>
              <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Brands.taxId')}</Label>
              <Input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Companies.website')}</Label>
              <Input value={form.website} onChange={(e) => set('website', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Brands.contactPerson')}</Label>
              <Input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.email')}</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.phone')}</Label>
              <Input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">{t('Brands.defaultCommission')}</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.defaultCommissionType} onValueChange={(v) => set('defaultCommissionType', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">% sobre venta</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Cantidad fija por venta</SelectItem>
                    <SelectItem value="TIERED">Escalonado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.defaultCommissionValue}
                  onChange={(e) => set('defaultCommissionValue', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Marca activa
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
