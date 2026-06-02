'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createContact, updateContact } from '@/app/(dashboard)/contacts/actions';
import type { Contact, Company, User } from '@prisma/client';

interface ContactFormProps {
  contact?: Contact;
  companies: Company[];
  users: User[];
  onSuccess: () => void;
}

export function ContactForm({ contact, companies, users, onSuccess }: ContactFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    mobile: contact?.mobile ?? '',
    jobTitle: contact?.jobTitle ?? '',
    department: contact?.department ?? '',
    address: contact?.address ?? '',
    city: contact?.city ?? '',
    country: contact?.country ?? '',
    source: contact?.source ?? '',
    notes: contact?.notes ?? '',
    companyId: contact?.companyId ?? '',
    ownerId: contact?.ownerId ?? '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (contact) {
          await updateContact(contact.id, form);
        } else {
          await createContact(form);
        }
        toast.success(t('Common.saved'));
        onSuccess();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('Contacts.firstName')} *</Label>
          <Input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('Contacts.lastName')} *</Label>
          <Input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('Common.email')}</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('Common.phone')}</Label>
          <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="jobTitle">{t('Contacts.jobTitle')}</Label>
          <Input id="jobTitle" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">{t('Contacts.company')}</Label>
          <Select value={form.companyId} onValueChange={(v) => set('companyId', v === '_none' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Sin empresa —</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="source">Origen</Label>
          <Input id="source" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Web, referido..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="owner">{t('Common.owner')}</Label>
          <Select value={form.ownerId} onValueChange={(v) => set('ownerId', v === '_none' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Sin asignar —</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t('Common.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('Common.save')}
        </Button>
      </div>
    </form>
  );
}
