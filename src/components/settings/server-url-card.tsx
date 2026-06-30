'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { getServerUrl, setServerUrl, pingServer, isCapacitorApp, clearServerUrl } from '@/lib/server-url';
import { toast } from 'sonner';

export function ServerUrlCard() {
  const [url, setUrl] = useState('');
  const [original, setOriginal] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isCapacitorApp());
    const u = getServerUrl();
    if (u) {
      setUrl(u);
      setOriginal(u);
    }
  }, []);

  // Solo mostramos esta card en la app nativa
  if (!native) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> Servidor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Estás conectado a <code className="text-foreground">{typeof window !== 'undefined' ? window.location.origin : ''}</code>.
          Esta opción solo aparece en la app móvil/escritorio.
        </CardContent>
      </Card>
    );
  }

  const test = async () => {
    setStatus('checking');
    setError(null);
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const fullUrl = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
    const r = await pingServer(fullUrl);
    if (r.ok) {
      setStatus('ok');
      setLatency(r.latencyMs ?? null);
    } else {
      setStatus('error');
      setError(r.error ?? 'Error de red');
    }
  };

  const save = () => {
    setServerUrl(url);
    toast.success('Servidor actualizado. Reiniciando aplicación…');
    setTimeout(() => window.location.reload(), 1500);
  };

  const reset = () => {
    if (!confirm('¿Borrar la configuración y volver a la pantalla de bienvenida?')) return;
    clearServerUrl();
    window.location.reload();
  };

  const changed = url !== original;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" /> Servidor BrandHub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">URL ACTUAL</label>
          <p className="font-mono text-sm flex items-center gap-2 mt-1">
            <code className="bg-muted px-2 py-1 rounded">{original}</code>
            <a href={original} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">CAMBIAR A</label>
          <Input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus('idle'); }}
            placeholder="https://tuempresa.vercel.app"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {status === 'ok' && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded p-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Servidor responde · {latency}ms
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded p-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={test} disabled={status === 'checking' || !changed}>
            {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
            Probar
          </Button>
          <Button onClick={save} disabled={!changed || status !== 'ok'}>
            Guardar y reiniciar
          </Button>
          <Button variant="ghost" onClick={reset} className="ml-auto text-destructive hover:text-destructive">
            Restablecer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
