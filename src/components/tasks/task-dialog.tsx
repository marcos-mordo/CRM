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
import { createTask, updateTask } from '@/app/(dashboard)/tasks/actions';
import type { Contact, Deal, Task, User } from '@prisma/client';

interface Props {
  task?: Task;
  users: User[];
  contacts: Contact[];
  deals: Deal[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function TaskDialog({ task, users, contacts, deals, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'MEDIUM',
    status: task?.status ?? 'PENDING',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
    assigneeId: task?.assigneeId ?? '',
    contactId: task?.contactId ?? '',
    dealId: task?.dealId ?? '',
  });

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          ...form,
          assigneeId: form.assigneeId || null,
          contactId: form.contactId || null,
          dealId: form.dealId || null,
          dueDate: form.dueDate || null,
        };
        if (task) await updateTask(task.id, payload as any);
        else await createTask(payload as any);
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
      {!task && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            {t('Tasks.new')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? t('Common.edit') : t('Tasks.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Tasks.priority')}</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('Tasks.priorities.LOW')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('Tasks.priorities.MEDIUM')}</SelectItem>
                  <SelectItem value="HIGH">{t('Tasks.priorities.HIGH')}</SelectItem>
                  <SelectItem value="URGENT">{t('Tasks.priorities.URGENT')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Tasks.dueDate')}</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Tasks.assignee')}</Label>
              <Select value={form.assigneeId} onValueChange={(v) => set('assigneeId', v === '_none' ? '' : v)}>
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
              <Label>{t('Common.status')}</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">{t('Tasks.statuses.PENDING')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('Tasks.statuses.IN_PROGRESS')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('Tasks.statuses.COMPLETED')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('Tasks.statuses.CANCELLED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Oportunidad</Label>
              <Select value={form.dealId} onValueChange={(v) => set('dealId', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Ninguna —</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
