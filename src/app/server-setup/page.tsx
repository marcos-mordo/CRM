'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/brand-logo';
import { Cloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getServerUrl, setServerUrl, pingServer, isCapacitorApp } from '@/lib/server-url';

const DEFAULT_HINT = 'https://brandhub.vercel.app';

export default function ServerSetupPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getServerUrl();
    if (existing) setUrl(existing);
    else setUrl(DEFAULT_HINT);
  }, []);

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
      setError(r.error ?? 'Error desconocido');
    }
  };

  const save = () => {
    setServerUrl(url);
    // Recarga apuntando al servidor configurado
    if (isCapacitorApp()) {
      // En Capacitor, no podemos navegar a otra URL externa así.
      // Mostramos instrucciones de reiniciar.
      alert('Configuración guardada. La app se reiniciará para aplicar los cambios.');
      // Trigger reload Capacitor: cerrar y reabrir manualmente
      try { (window as any).Capacitor?.App?.exitApp?.(); } catch {}
      window.location.reload();
    } else {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const fullUrl = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
      window.location.href = `${fullUrl}/login`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <BrandLogo size={64} className="mx-auto mb-3 rounded-xl shadow" />
            <h1 className="text-xl font-bold flex items-center justify-center gap-2">
              <Cloud className="h-5 w-5" /> Configura tu servidor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta esta app al servidor BrandHub de tu organización.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL del servidor</label>
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setStatus('idle'); }}
              placeholder="https://brandhub.tuempresa.com"
              autoComplete="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Si tu empresa usa el deploy gratuito en Vercel, la URL termina en
              <code className="ml-1">.vercel.app</code>
            </p>
          </div>

          {status === 'ok' && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Conexión OK · {latency}ms</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No se pudo conectar</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={test} disabled={status === 'checking' || !url} variant="outline">
              {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
              Probar
            </Button>
            <Button onClick={save} disabled={status !== 'ok'}>
              Guardar y continuar
            </Button>
          </div>

          <div className="border-t pt-3 space-y-1 text-[11px] text-muted-foreground">
            <p>¿Aún no tienes servidor? Pídele a tu admin la URL.</p>
            <p>¿Eres admin? Despliega en 5 min con <strong>Vercel + Neon</strong> (gratis). Ver README.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
