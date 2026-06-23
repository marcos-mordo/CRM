'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Eye, RotateCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { retryDelivery } from '@/app/(dashboard)/settings/webhooks/deliveries/actions';
import type { WebhookDelivery, WebhookDeliveryStatus } from '@prisma/client';

type Row = WebhookDelivery & { endpoint: { id: string; name: string; url: string } };

const STATUS_VARIANT: Record<WebhookDeliveryStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'destructive',
};

interface Props {
  deliveries: Row[];
  endpoints: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  selectedEndpoint?: string;
  selectedStatus?: string;
}

export function WebhookDeliveriesTable({
  deliveries, endpoints, total, page, pageSize, selectedEndpoint, selectedStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewing, setViewing] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();

  const setParam = (k: string, v: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!v || v === '_all') params.delete(k);
    else params.set(k, v);
    params.delete('page');
    router.push(`/settings/webhooks/deliveries?${params.toString()}`);
  };

  const goPage = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(n));
    router.push(`/settings/webhooks/deliveries?${params.toString()}`);
  };

  const retry = (id: string) => {
    startTransition(async () => {
      try {
        const res = await retryDelivery(id);
        if (res.ok) toast.success(`Reintentado OK (HTTP ${res.httpStatus})`);
        else toast.error(`Falló: ${res.error || `HTTP ${res.httpStatus}`}`);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <Select value={selectedEndpoint ?? '_all'} onValueChange={(v) => setParam('endpoint', v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos los endpoints" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los endpoints</SelectItem>
            {endpoints.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus ?? '_all'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            <SelectItem value="SUCCESS">Éxito</SelectItem>
            <SelectItem value="FAILED">Fallidos</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>HTTP</TableHead>
            <TableHead>Intentos</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                Sin envíos para los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(d.createdAt)}</TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{d.endpoint.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{d.endpoint.url}</p>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs font-mono">{d.event}</Badge></TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge></TableCell>
                <TableCell className="text-sm">{d.httpStatus ?? '—'}</TableCell>
                <TableCell className="text-sm">{d.attempts}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewing(d)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => retry(d.id)} disabled={isPending}>
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => goPage(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery {viewing?.id.slice(0, 8)}…</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Endpoint</p>
                  <p className="font-medium">{viewing.endpoint.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{viewing.endpoint.url}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant={STATUS_VARIANT[viewing.status]}>{viewing.status}</Badge>
                  {viewing.httpStatus && <p className="text-xs mt-1">HTTP {viewing.httpStatus}</p>}
                  {viewing.lastError && <p className="text-xs text-destructive mt-1">{viewing.lastError}</p>}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payload enviado</p>
                <pre className="bg-muted text-[10px] font-mono p-3 rounded max-h-48 overflow-auto scrollbar-thin">
                  {JSON.stringify(viewing.payload, null, 2)}
                </pre>
              </div>
              {viewing.response && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Respuesta recibida</p>
                  <pre className="bg-muted text-[10px] font-mono p-3 rounded max-h-32 overflow-auto scrollbar-thin">
                    {viewing.response}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
