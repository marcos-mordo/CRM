'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Copy, ExternalLink, XCircle, Save, Loader2 } from 'lucide-react';
import { upsertBookingPage, toggleBookingPage, cancelBooking } from '@/app/(dashboard)/bookings/actions';

const WEEKDAYS = [
  { n: 1, label: 'L' }, { n: 2, label: 'M' }, { n: 3, label: 'X' },
  { n: 4, label: 'J' }, { n: 5, label: 'V' }, { n: 6, label: 'S' }, { n: 7, label: 'D' },
];

type PageData = {
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  availability: Record<string, [string, string]>;
  active: boolean;
};

type BookingItem = {
  id: string; name: string; email: string; phone: string | null;
  notes: string | null; startsAt: string; endsAt: string;
};

export function BookingsManager({ page, upcoming }: { page: PageData | null; upcoming: BookingItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialDays = page ? Object.keys(page.availability).map(Number) : [1, 2, 3, 4, 5];
  const initialWindow = page ? Object.values(page.availability)[0] ?? ['09:00', '18:00'] : ['09:00', '18:00'];

  const [title, setTitle] = useState(page?.title ?? 'Reunión de 30 minutos');
  const [description, setDescription] = useState(page?.description ?? '');
  const [duration, setDuration] = useState(String(page?.durationMinutes ?? 30));
  const [days, setDays] = useState<number[]>(initialDays);
  const [startTime, setStartTime] = useState(initialWindow[0]);
  const [endTime, setEndTime] = useState(initialWindow[1]);

  const save = () => {
    if (days.length === 0) { toast.error('Elige al menos un día'); return; }
    startTransition(async () => {
      try {
        const r = await upsertBookingPage({
          title,
          description: description || undefined,
          durationMinutes: Number(duration),
          weekdays: days,
          startTime,
          endTime,
        });
        toast.success(page ? 'Página actualizada' : `Página creada: /book/${r.slug}`);
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const copyLink = () => {
    if (!page) return;
    navigator.clipboard.writeText(`${window.location.origin}/book/${page.slug}`);
    toast.success('Link copiado — compártelo con tus clientes');
  };

  const cancel = (id: string) => {
    if (!confirm('¿Cancelar esta reunión?')) return;
    startTransition(async () => {
      await cancelBooking(id);
      toast.success('Reunión cancelada');
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Mi página de reservas
          </CardTitle>
          {page && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{page.active ? 'Activa' : 'Pausada'}</span>
              <Switch
                checked={page.active}
                onCheckedChange={(v) => startTransition(async () => { await toggleBookingPage(v); router.refresh(); })}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {page && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink} className="flex-1">
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </Button>
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a href={`/book/${page.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver página
                </a>
              </Button>
            </div>
          )}

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cuéntanos brevemente qué necesitas" />
          </div>
          <div>
            <Label>Duración</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1,5 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Días disponibles</Label>
            <div className="flex gap-1.5 mt-1">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    onClick={() => setDays(on ? days.filter((x) => x !== d.n) : [...days, d.n])}
                    className={`h-9 w-9 rounded-full text-sm font-medium transition ${
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <Button onClick={save} disabled={pending} className="w-full">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {page ? 'Guardar cambios' : 'Crear mi página'}
          </Button>
        </CardContent>
      </Card>

      {/* Próximas reuniones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas reuniones ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Sin reuniones programadas.<br />
              {page ? 'Comparte tu link para recibir reservas.' : 'Crea tu página para empezar.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <li key={b.id} className="border rounded-lg p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.startsAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{b.email}{b.phone ? ` · ${b.phone}` : ''}
                    </p>
                    {b.notes && <p className="text-xs mt-1 text-muted-foreground italic truncate">{b.notes}</p>}
                  </div>
                  <button onClick={() => cancel(b.id)} title="Cancelar" className="text-muted-foreground hover:text-destructive shrink-0">
                    <XCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
