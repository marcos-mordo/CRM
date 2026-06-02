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
import { createCompany, updateCompany } from '@/app/(dashboard)/companies/actions';
import type { Company } from '@prisma/client';

interface CompanyDialogProps {
  company?: Company;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function CompanyDialog({ company, trigger, open: ctrlOpen, onOpenChange }: CompanyDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: company?.name ?? '',
    industry: company?.industry ?? '',
    website: company?.website ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    address: company?.address ?? '',
    city: company?.city ?? '',
    country: company?.country ?? '',
    size: company?.size ?? '',
    annualRevenue: company?.annualRevenue ? Number(company.annualRevenue) : null,
    notes: company?.notes ?? '',
  });

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (company) await updateCompany(company.id, form);
        else await createCompany(form);
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
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !company ? (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('Companies.new')}
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company ? t('Common.edit') : t('Companies.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cname">{t('Common.name')} *</Label>
            <Input id="cname" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="industry">{t('Companies.industry')}</Label>
              <Input id="industry" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">{t('Companies.size')}</Label>
              <Input id="size" placeholder="1-10, 11-50..." value={form.size} onChange={(e) => set('size', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="website">{t('Companies.website')}</Label>
              <Input id="website" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('Common.phone')}</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('Common.email')}</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revenue">{t('Companies.annualRevenue')}</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                value={form.annualRevenue ?? ''}
                onChange={(e) => set('annualRevenue', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <Input id="country" value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('Common.cancel')}
            </Button>
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
