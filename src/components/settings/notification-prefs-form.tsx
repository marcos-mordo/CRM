'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, Send } from 'lucide-react';
import { saveNotificationPrefs } from '@/app/(dashboard)/settings/notifications/actions';

const EVENTS = [
  { key: 'SALE_SIGNED', label: 'Venta firmada' },
  { key: 'SALE_CANCELLED', label: 'Venta cancelada' },
  { key: 'COMMISSION_APPROVED', label: 'Comisión aprobada' },
  { key: 'COMMISSION_PAID', label: 'Comisión pagada' },
  { key: 'LEAD_ASSIGNED', label: 'Lead asignado' },
  { key: 'TASK_DUE', label: 'Tarea vencida' },
  { key: 'DEAL_WON', label: 'Deal ganado' },
  { key: 'DEAL_LOST', label: 'Deal perdido' },
  { key: 'TICKET_NEW', label: 'Nuevo ticket' },
  { key: 'MENTION', label: 'Mención (@)' },
];

export function NotificationPrefsForm({
  initial,
}: {
  initial: {
    emailDigest: boolean;
    emailInstant: boolean;
    pushEnabled: boolean;
    telegramEnabled: boolean;
    events: Record<string, boolean>;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [emailDigest, setEmailDigest] = useState(initial.emailDigest);
  const [emailInstant, setEmailInstant] = useState(initial.emailInstant);
  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled);
  const [telegramEnabled, setTelegramEnabled] = useState(initial.telegramEnabled);
  const [events, setEvents] = useState<Record<string, boolean>>(
    Object.fromEntries(EVENTS.map((e) => [e.key, initial.events[e.key] ?? true])),
  );

  const save = () => {
    startTransition(async () => {
      try {
        await saveNotificationPrefs({ emailDigest, emailInstant, pushEnabled, telegramEnabled, events });
        toast.success('Preferencias guardadas');
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Este navegador no soporta notificaciones');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast.error('Permiso denegado');
      return;
    }
    // Suscribirse
    const reg = await navigator.serviceWorker.ready;
    const pubRes = await fetch('/api/push/subscribe');
    if (!pubRes.ok) { toast.error('Push no configurado en el servidor'); return; }
    const { publicKey } = await pubRes.json();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
    const post = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    if (post.ok) toast.success('Notificaciones push activadas');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Canales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={emailDigest} onCheckedChange={(v) => setEmailDigest(!!v)} className="mt-1" />
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email digest matinal</p>
              <p className="text-xs text-muted-foreground">Un email resumen a primera hora con tus tareas y leads</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={emailInstant} onCheckedChange={(v) => setEmailInstant(!!v)} className="mt-1" />
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email instantáneo</p>
              <p className="text-xs text-muted-foreground">Un email por cada evento marcado abajo</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={pushEnabled} onCheckedChange={(v) => setPushEnabled(!!v)} className="mt-1" />
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> Push (móvil / navegador)</p>
              <p className="text-xs text-muted-foreground">Notificaciones nativas en tu móvil o navegador</p>
              <Button size="sm" variant="link" className="h-6 p-0" onClick={(e) => { e.preventDefault(); requestPushPermission(); }}>
                Activar en este dispositivo
              </Button>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={telegramEnabled} onCheckedChange={(v) => setTelegramEnabled(!!v)} className="mt-1" />
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2"><Send className="h-3.5 w-3.5" /> Telegram</p>
              <p className="text-xs text-muted-foreground">Al bot BrandHub (configura tu chat en el perfil)</p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EVENTS.map((e) => (
            <label key={e.key} className="flex items-center gap-3 cursor-pointer text-sm py-1.5">
              <Checkbox
                checked={events[e.key]}
                onCheckedChange={(v) => setEvents({ ...events, [e.key]: !!v })}
              />
              <span>{e.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>Guardar preferencias</Button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const s = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
