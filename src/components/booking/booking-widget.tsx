'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, CalendarDays, Clock, ChevronLeft } from 'lucide-react';

type Slot = { startsAt: string; endsAt: string };

function nextDays(n: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    out.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  }
  return out;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookingWidget({ slug, durationMinutes }: { slug: string; durationMinutes: number }) {
  const days = nextDays(14);
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<'pick' | 'form' | 'sending' | 'done' | 'error'>('pick');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setLoading(true);
    setSlots([]);
    fetch(`/api/book/${slug}?date=${toISO(selectedDay)}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [slug, selectedDay]);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(`/api/book/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, notes: notes || undefined, startsAt: selectedSlot.startsAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'No se pudo reservar');
      setStatus('done');
    } catch (err: any) {
      setStatus('form');
      setError(err.message);
    }
  };

  if (status === 'done') {
    const when = selectedSlot ? new Date(selectedSlot.startsAt).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : '';
    return (
      <Card className="shadow-xl">
        <CardContent className="p-10 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold">¡Cita confirmada!</h2>
          <p className="text-muted-foreground">{when}</p>
          <p className="text-sm text-muted-foreground">Te esperamos. Si necesitas cambiarla, responde al email de confirmación.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardContent className="p-6">
        {status === 'pick' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4" /> Elige día
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {days.map((d) => {
                  const active = toISO(d) === toISO(selectedDay);
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => setSelectedDay(d)}
                      className={`shrink-0 px-3 py-2 rounded-lg border text-sm capitalize transition ${
                        active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      {fmtDate(d)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" /> Elige hora ({durationMinutes} min)
              </p>
              {loading ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin huecos este día. Prueba otro.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.startsAt}
                      onClick={() => { setSelectedSlot(s); setStatus('form'); }}
                      className="px-3 py-2 rounded-lg border text-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition"
                    >
                      {new Date(s.startsAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(status === 'form' || status === 'sending') && selectedSlot && (
          <form onSubmit={book} className="space-y-4">
            <button type="button" onClick={() => setStatus('pick')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Cambiar hora
            </button>
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium">
              {new Date(selectedSlot.startsAt).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
            </div>
            <div>
              <Label htmlFor="bk-name">Nombre *</Label>
              <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <Label htmlFor="bk-email">Email *</Label>
              <Input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="bk-phone">Teléfono</Label>
              <Input id="bk-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bk-notes">¿Algo que debamos saber?</Label>
              <Textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar cita
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
