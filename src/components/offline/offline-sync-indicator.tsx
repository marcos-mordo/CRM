'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { createSale } from '@/app/(dashboard)/sales-orders/actions';
import { getAll, isOnline, markFailed, pendingCount, remove } from '@/lib/offline-queue';

export function OfflineSyncIndicator() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    setOnline(isOnline());
    try {
      setPending(await pendingCount());
    } catch {
      // IndexedDB no disponible: ignorar
    }
  };

  useEffect(() => {
    refresh();
    const onOnline = () => {
      setOnline(true);
      sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, []);

  const sync = () => {
    if (!isOnline()) {
      toast.error('Sin conexión');
      return;
    }
    startTransition(async () => {
      try {
        const ops = await getAll();
        if (ops.length === 0) {
          toast.info('No hay operaciones pendientes');
          return;
        }
        let ok = 0;
        let fail = 0;
        for (const op of ops) {
          try {
            if (op.type === 'CREATE_SALE') {
              await createSale({ ...op.payload, clientUuid: op.uuid });
              await remove(op.uuid);
              ok++;
            }
          } catch (e: any) {
            await markFailed(op.uuid, e.message ?? 'error');
            fail++;
          }
        }
        if (ok > 0) toast.success(`${ok} ventas sincronizadas`);
        if (fail > 0) toast.error(`${fail} fallaron — revisa la cola`);
        await refresh();
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  if (online && pending === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Cloud className="h-3 w-3 text-emerald-600" /> Online
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <Badge variant="destructive" className="gap-1 text-xs">
          <CloudOff className="h-3 w-3" /> Offline
        </Badge>
      )}
      {pending > 0 && (
        <Button variant="outline" size="sm" onClick={sync} disabled={isPending || !online}>
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          {pending} pendientes
        </Button>
      )}
    </div>
  );
}
