'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Key, Loader2, Plus, ShieldOff, Trash2 } from 'lucide-react';
import { createApiToken, deleteApiToken, revokeApiToken } from '@/app/(dashboard)/settings/api-tokens/actions';
import { formatDate } from '@/lib/utils';
import type { ApiToken, ApiTokenScope } from '@prisma/client';

const ALL_SCOPES: ApiTokenScope[] = [
  'READ_SALES', 'WRITE_SALES',
  'READ_CUSTOMERS', 'WRITE_CUSTOMERS',
  'READ_BRANDS', 'WRITE_BRANDS',
  'READ_COMMISSIONS',
  'ADMIN_ALL',
];

export function ApiTokensManager({ tokens }: { tokens: ApiToken[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: '',
    scopes: [] as ApiTokenScope[],
    expiresAt: '',
  });

  const toggleScope = (s: ApiTokenScope) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s],
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.scopes.length === 0) return toast.error('Selecciona al menos un scope');
    startTransition(async () => {
      try {
        const res = await createApiToken({
          name: form.name,
          scopes: form.scopes,
          expiresAt: form.expiresAt || null,
        });
        setCreatedToken(res.plain);
        setForm({ name: '', scopes: [], expiresAt: '' });
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const revoke = (id: string) => {
    if (!confirm('Revocar este token cortará el acceso inmediatamente. ¿Continuar?')) return;
    startTransition(async () => {
      await revokeApiToken(id);
      toast.success('Token revocado');
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar permanentemente?')) return;
    startTransition(async () => {
      await deleteApiToken(id);
      toast.success('Eliminado');
      router.refresh();
    });
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copiado'));
  };

  const closeCreatedDialog = () => {
    setCreatedToken(null);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API tokens</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tokens para integrar BrandHub con sistemas externos vía API REST.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (!o) setCreatedToken(null); setOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nuevo token</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            {createdToken ? (
              <>
                <DialogHeader>
                  <DialogTitle>Token creado</DialogTitle>
                  <DialogDescription>
                    Copia el token ahora. <strong>No volverá a mostrarse</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  <code className="text-xs font-mono break-all">{createdToken}</code>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => copy(createdToken)}>
                    <Copy className="h-4 w-4" /> Copiar
                  </Button>
                  <Button onClick={closeCreatedDialog}>Ya lo guardé</Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Nuevo API token</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Integración Zapier"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Caducidad (opcional)</Label>
                    <Input
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Scopes *</Label>
                    <div className="border rounded-lg p-2 grid grid-cols-2 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                      {ALL_SCOPES.map((s) => (
                        <label key={s} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                          <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} />
                          <span className="font-mono">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Crear token
                    </Button>
                  </div>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sin tokens generados. Crea uno para empezar a usar la API.
          </div>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => {
              const revoked = !!t.revokedAt;
              const expired = t.expiresAt && t.expiresAt < new Date();
              return (
                <li key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{t.name}</p>
                        {revoked && <Badge variant="destructive" className="text-xs">Revocado</Badge>}
                        {!revoked && expired && <Badge variant="warning" className="text-xs">Caducado</Badge>}
                        {!revoked && !expired && <Badge variant="success" className="text-xs">Activo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.prefix}…</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.scopes.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Creado {formatDate(t.createdAt)}
                        {t.lastUsedAt && ` · Último uso ${formatDate(t.lastUsedAt)}`}
                        {t.expiresAt && ` · Caduca ${formatDate(t.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!revoked && (
                        <Button size="sm" variant="ghost" onClick={() => revoke(t.id)}>
                          <ShieldOff className="h-3.5 w-3.5" /> Revocar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Usar la API:</p>
          <pre className="bg-muted px-3 py-2 rounded text-[10px] font-mono overflow-x-auto">
{`curl -H "Authorization: Bearer bh_..." \\
  ${typeof window !== 'undefined' ? window.location.origin : 'https://brandhub.tudominio.com'}/api/v1/sales`}
          </pre>
          <p>Endpoints disponibles:</p>
          <ul className="list-disc list-inside ml-2">
            <li><code className="font-mono">GET /api/v1/sales</code> · <code className="font-mono">POST /api/v1/sales</code></li>
            <li><code className="font-mono">GET /api/v1/customers</code> · <code className="font-mono">POST /api/v1/customers</code></li>
            <li><code className="font-mono">GET /api/v1/brands</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
