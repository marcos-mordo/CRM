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
import { createLead, updateLead } from '@/app/(dashboard)/leads/actions';
import type { Lead, User } from '@prisma/client';

const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;

interface Props {
  lead?: Lead;
  users: User[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function LeadDialog({ lead, users, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    firstName: lead?.firstName ?? '',
    lastName: lead?.lastName ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    company: lead?.company ?? '',
    jobTitle: lead?.jobTitle ?? '',
    source: lead?.source ?? '',
    status: lead?.status ?? 'NEW',
    score: lead?.score ?? 0,
    estimatedValue: lead?.estimatedValue ? Number(lead.estimatedValue) : null,
    notes: lead?.notes ?? '',
    ownerId: lead?.ownerId ?? '',
  });

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (lead) await updateLead(lead.id, form as any);
        else await createLead(form as any);
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
      {!lead && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('Leads.new')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? t('Common.edit') : t('Leads.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Contacts.firstName')} *</Label>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Contacts.lastName')} *</Label>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Common.email')}</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.phone')}</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Contacts.company')}</Label>
              <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Contacts.jobTitle')}</Label>
              <Input value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Common.status')}</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{t(`Leads.status.${s}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Leads.score')} (0-100)</Label>
              <Input type="number" min="0" max="100" value={form.score} onChange={(e) => set('score', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Leads.estimatedValue')}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.estimatedValue ?? ''}
                onChange={(e) => set('estimatedValue', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Leads.source')}</Label>
              <Input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Web, Anuncio, Referido..." />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Common.owner')}</Label>
              <Select value={form.ownerId} onValueChange={(v) => set('ownerId', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Sin asignar —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
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
