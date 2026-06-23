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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus } from 'lucide-react';
import { createEndCustomer, updateEndCustomer } from '@/app/(dashboard)/end-customers/actions';
import type { EndCustomer } from '@prisma/client';

interface Props {
  customer?: EndCustomer;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function EndCustomerDialog({ customer, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    isCompany: customer?.isCompany ?? false,
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    companyName: customer?.companyName ?? '',
    taxId: customer?.taxId ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    mobile: customer?.mobile ?? '',
    address: customer?.address ?? '',
    city: customer?.city ?? '',
    postalCode: customer?.postalCode ?? '',
    province: customer?.province ?? '',
    country: customer?.country ?? 'España',
    notes: customer?.notes ?? '',
    gdprConsent: customer?.gdprConsent ?? false,
    marketingConsent: customer?.marketingConsent ?? false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gdprConsent) {
      toast.error('Debes confirmar el consentimiento RGPD antes de guardar');
      return;
    }
    startTransition(async () => {
      try {
        if (customer) await updateEndCustomer(customer.id, form);
        else await createEndCustomer(form);
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
      {!customer && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('EndCustomers.new')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? t('Common.edit') : t('EndCustomers.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={form.isCompany ? 'company' : 'person'} onValueChange={(v) => set('isCompany', v === 'company')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="person">{t('EndCustomers.isPerson')}</TabsTrigger>
              <TabsTrigger value="company">{t('EndCustomers.isCompany')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {form.isCompany ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('EndCustomers.companyName')} *</Label>
                <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>CIF *</Label>
                <Input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos *</Label>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>DNI/NIE *</Label>
                <Input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} required />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Common.email')}</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.phone')}</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Móvil</Label>
              <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t('EndCustomers.postalCode')}</Label>
              <Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('EndCustomers.province')}</Label>
              <Input value={form.province} onChange={(e) => set('province', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="border-t pt-4 space-y-2 bg-amber-50/50 dark:bg-amber-950/20 -mx-6 px-6 py-3 rounded">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.gdprConsent}
                onChange={(e) => set('gdprConsent', e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong>{t('EndCustomers.gdprConsent')} *</strong> — Confirmo que el cliente ha sido informado del tratamiento de sus datos personales conforme al RGPD.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(e) => set('marketingConsent', e.target.checked)}
                className="mt-0.5"
              />
              <span>{t('EndCustomers.marketingConsent')} (envío de comunicaciones comerciales)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Common.cancel')}</Button>
            <Button type="submit" disabled={isPending || !form.gdprConsent}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('Common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
