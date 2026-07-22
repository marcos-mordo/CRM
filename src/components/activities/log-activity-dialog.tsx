'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Users, StickyNote, Plus, Loader2, CalendarClock } from 'lucide-react';
import { logActivity } from '@/app/(dashboard)/activities/actions';

type ActType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

const TYPES: { value: ActType; label: string; icon: any }[] = [
  { value: 'CALL', label: 'Llamada', icon: Phone },
  { value: 'MEETING', label: 'Reunión', icon: Users },
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'NOTE', label: 'Nota', icon: StickyNote },
];

interface Props {
  contactId?: string;
  leadId?: string;
  dealId?: string;
  trigger?: React.ReactNode;
  size?: 'sm' | 'default';
}

export function LogActivityDialog({ contactId, leadId, dealId, trigger, size = 'sm' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<ActType>('CALL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => localDatetime(new Date()));
  const [addFollowUp, setAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const reset = () => {
    setType('CALL'); setSubject(''); setDescription(''); setOccurredAt(localDatetime(new Date()));
    setAddFollowUp(false); setFollowUpTitle(''); setFollowUpDate('');
  };

  const submit = () => {
    if (!subject.trim()) { toast.error('Escribe un asunto'); return; }
    startTransition(async () => {
      try {
        await logActivity({
          type, subject, description: description || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          contactId, leadId, dealId,
          followUpTitle: addFollowUp ? followUpTitle : undefined,
          followUpDate: addFollowUp && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        });
        toast.success('Actividad registrada');
        setOpen(false); reset(); router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size={size}><Plus className="h-4 w-4" /> Registrar actividad</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registrar actividad</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>

          <div>
            <Label htmlFor="act-subject">Asunto</Label>
            <Input id="act-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. Llamada de seguimiento sobre la propuesta" autoFocus />
          </div>

          <div>
            <Label htmlFor="act-desc">Notas (opcional)</Label>
            <textarea
              id="act-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Qué se habló, próximos pasos…"
            />
          </div>

          <div>
            <Label htmlFor="act-date">Fecha y hora</Label>
            <Input id="act-date" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>

          {/* Seguimiento */}
          <div className="rounded-md border p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={addFollowUp} onChange={(e) => setAddFollowUp(e.target.checked)} className="h-4 w-4" />
              <CalendarClock className="h-4 w-4" /> Programar tarea de seguimiento
            </label>
            {addFollowUp && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ej. Enviar contrato" value={followUpTitle} onChange={(e) => setFollowUpTitle(e.target.value)} />
                <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function localDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
