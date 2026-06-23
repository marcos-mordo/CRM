'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Eye, EyeOff, History, Key, Loader2, Plus, Trash2, Webhook } from 'lucide-react';
import Link from 'next/link';
import { createWebhook, deleteWebhook, rotateSecret, updateWebhook } from '@/app/(dashboard)/settings/webhooks/actions';
import type { WebhookEndpoint, WebhookEvent } from '@prisma/client';

const ALL_EVENTS: WebhookEvent[] = [
  'SALE_CREATED', 'SALE_SIGNED', 'SALE_CANCELLED',
  'COMMISSION_APPROVED', 'COMMISSION_PAID',
  'CUSTOMER_CREATED', 'BRAND_CREATED',
];

export function WebhooksManager({ webhooks }: { webhooks: WebhookEndpoint[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    events: [] as WebhookEvent[],
    active: true,
  });

  const reset = () =>
    setForm({ name: '', url: '', description: '', events: [], active: true });

  const startEdit = (w: WebhookEndpoint) => {
    setForm({
      name: w.name,
      url: w.url,
      description: w.description ?? '',
      events: w.events,
      active: w.active,
    });
    setEditing(w);
    setOpen(true);
  };

  const toggleEvent = (ev: WebhookEvent) => {
    setForm((s) => ({
      ...s,
      events: s.events.includes(ev) ? s.events.filter((e) => e !== ev) : [...s.events, ev],
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.events.length === 0) return toast.error('Selecciona al menos un evento');
    startTransition(async () => {
      try {
        if (editing) await updateWebhook(editing.id, form);
        else await createWebhook(form);
        toast.success('Webhook guardado');
        setOpen(false);
        setEditing(null);
        reset();
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar este webhook?')) return;
    startTransition(async () => {
      await deleteWebhook(id);
      toast.success('Eliminado');
      router.refresh();
    });
  };

  const rotate = (id: string) => {
    if (!confirm('Rotar la clave secreta inutilizará la actual. ¿Continuar?')) return;
    startTransition(async () => {
      const res = await rotateSecret(id);
      toast.success('Clave rotada');
      navigator.clipboard?.writeText(res.secret).catch(() => {});
      router.refresh();
    });
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copiado'));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Webhooks salientes</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Recibe eventos de BrandHub en Slack, Zapier, n8n, Make o cualquier endpoint HTTPS.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/settings/webhooks/deliveries"><History className="h-4 w-4" /> Historial</Link>
        </Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nuevo webhook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar webhook' : 'Nuevo webhook'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>URL del endpoint *</Label>
                <Input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Eventos *</Label>
                <div className="border rounded-lg p-2 grid grid-cols-2 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={form.events.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                      />
                      <span className="font-mono">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Activo
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sin webhooks configurados. Crea uno para empezar a recibir eventos en sistemas externos.
          </div>
        ) : (
          <ul className="space-y-2">
            {webhooks.map((w) => (
              <li key={w.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{w.name}</p>
                      {w.active ? <Badge variant="success" className="text-xs">Activo</Badge> : <Badge variant="secondary" className="text-xs">Pausado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{w.url}</p>
                    {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs font-mono">{ev}</Badge>
                      ))}
                    </div>
                    {w.secret && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Key className="h-3 w-3 text-muted-foreground" />
                        <code className="font-mono bg-muted px-2 py-0.5 rounded text-[10px]">
                          {showSecret === w.id ? w.secret : '••••••••••••••••••••'}
                        </code>
                        <button type="button" onClick={() => setShowSecret(showSecret === w.id ? null : w.id)}>
                          {showSecret === w.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button type="button" onClick={() => copy(w.secret!)}>
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(w)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => rotate(w.id)}>Rotar clave</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(w.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
