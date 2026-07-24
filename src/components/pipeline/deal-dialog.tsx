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
import { Loader2, Activity } from 'lucide-react';
import { LogActivityDialog } from '@/components/activities/log-activity-dialog';
import { DealLineItems } from './deal-line-items';
import { CustomFieldsCardLazy } from '@/components/custom-fields/custom-fields-card-lazy';
import { createDeal, updateDeal } from '@/app/(dashboard)/pipeline/actions';
import type { Contact, Company, Deal, Stage, User } from '@prisma/client';

interface Props {
  deal?: Deal;
  pipeline: { id: string; stages: Stage[] };
  contacts: Contact[];
  companies: Company[];
  users: User[];
  products?: any[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function DealDialog({ deal, pipeline, contacts, companies, users, products = [], open, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: deal?.title ?? '',
    description: deal?.description ?? '',
    amount: deal ? Number(deal.amount) : 0,
    currency: deal?.currency ?? 'USD',
    probability: deal?.probability ?? 50,
    expectedCloseDate: deal?.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10)
      : '',
    source: deal?.source ?? '',
    stageId: deal?.stageId ?? pipeline.stages[0]?.id ?? '',
    contactId: deal?.contactId ?? '',
    companyId: deal?.companyId ?? '',
    ownerId: deal?.ownerId ?? '',
  });

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          ...form,
          pipelineId: pipeline.id,
          contactId: form.contactId || null,
          companyId: form.companyId || null,
          ownerId: form.ownerId || null,
          expectedCloseDate: form.expectedCloseDate || null,
        };
        if (deal) await updateDeal(deal.id, payload);
        else await createDeal(payload as any);
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
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle>{deal ? t('Common.edit') : t('Pipeline.newDeal')}</DialogTitle>
            {deal && (
              <LogActivityDialog
                dealId={deal.id}
                contactId={(deal as any).contactId ?? undefined}
                trigger={<Button type="button" variant="outline" size="sm"><Activity className="h-4 w-4" /> Registrar actividad</Button>}
              />
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Pipeline.amount')} *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', Number(e.target.value))}
                required
              />
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
            <div className="space-y-1.5">
              <Label>{t('Pipeline.probability')} %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => set('probability', Number(e.target.value))}
              />
            </div>
          </div>

          {deal && (
            <DealLineItems
              dealId={deal.id}
              currency={form.currency}
              products={products}
              lines={(deal as any).lineItems ?? []}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Pipeline.stage')}</Label>
              <Select value={form.stageId} onValueChange={(v) => set('stageId', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipeline.stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Pipeline.expectedClose')}</Label>
              <Input type="date" value={form.expectedCloseDate} onChange={(e) => set('expectedCloseDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Contacts.company')}</Label>
              <Select value={form.companyId} onValueChange={(v) => set('companyId', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Ninguna —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Select value={form.contactId} onValueChange={(v) => set('contactId', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Ninguno —</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <Input value={form.source} onChange={(e) => set('source', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {deal && <CustomFieldsCardLazy entity="DEAL" entityId={deal.id} />}

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
