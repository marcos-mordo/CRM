'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function PwaRegister() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setOnline(navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      // Pide al SW que drene la cola
      navigator.serviceWorker?.controller?.postMessage({ type: 'sync-now' });
      // O usa Background Sync API si disponible
      navigator.serviceWorker?.ready.then((reg) => {
        if ('sync' in reg) {
          (reg as any).sync?.register('brandhub-sync').catch(() => {});
        }
      });
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Mensajes del service worker
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'queued') {
        setPending((p) => p + 1);
        toast.info('Sin conexión — cambio encolado', {
          description: 'Se enviará automáticamente al recuperar internet',
          duration: 3000,
        });
      }
      if (e.data?.type === 'synced') {
        const { sent } = e.data;
        setPending(0);
        if (sent > 0) {
          toast.success(`${sent} cambio${sent > 1 ? 's' : ''} sincronizado${sent > 1 ? 's' : ''}`, {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          });
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Registrar SW solo en producción
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('SW registration failed:', err));
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  // Indicador visual solo cuando hay algo que mostrar
  if (online && pending === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 z-30 lg:bottom-4">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg ${
          !online
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
        }`}
      >
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5" />
            <span>Sin conexión</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Sincronizando {pending}…</span>
          </>
        )}
      </div>
    </div>
  );
}
