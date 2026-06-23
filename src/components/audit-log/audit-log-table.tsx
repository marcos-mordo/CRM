'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { AuditAction, AuditLog } from '@prisma/client';

const ACTION_COLORS: Record<AuditAction, string> = {
  USER_LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  USER_INVITED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  USER_DEACTIVATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ROLE_CHANGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  SALE_CREATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  SALE_SIGNED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SALE_CANCELLED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SALE_REFUNDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  COMMISSION_APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  COMMISSION_PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  TEMPLATE_CREATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  TEMPLATE_UPDATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  TEMPLATE_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  BRAND_CREATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  BRAND_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CUSTOMERS_IMPORTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

interface Props {
  logs: AuditLog[];
  actors: { id: string; name: string }[];
  actions: AuditAction[];
  total: number;
  page: number;
  pageSize: number;
  selectedAction?: string;
  selectedActor?: string;
}

export function AuditLogTable({ logs, actors, actions, total, page, pageSize, selectedAction, selectedActor }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === '_all') params.delete(key);
    else params.set(key, value);
    params.delete('page');
    router.push(`/audit-log?${params.toString()}`);
  };

  const goPage = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(n));
    router.push(`/audit-log?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <Select value={selectedAction ?? '_all'} onValueChange={(v) => setParam('action', v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todas las acciones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las acciones</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a.replaceAll('_', ' ').toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedActor ?? '_all'} onValueChange={(v) => setParam('actor', v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos los usuarios" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los usuarios</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
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
            <TableHead>Acción</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Metadata</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                Sin eventos para los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge className={`border-transparent text-xs ${ACTION_COLORS[log.action]}`}>
                    {log.action.replaceAll('_', ' ').toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {log.actorName ? (
                    <>
                      <p className="font-medium">{log.actorName}</p>
                      {log.actorRole && (
                        <p className="text-xs text-muted-foreground capitalize">{log.actorRole.toLowerCase()}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sistema</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {log.entity ? (
                    <>
                      <p>{log.entity}</p>
                      {log.entityId && <p className="text-xs text-muted-foreground font-mono">{log.entityId.slice(0, 12)}…</p>}
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate font-mono">
                  {log.metadata ? JSON.stringify(log.metadata) : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{log.ip ?? '—'}</TableCell>
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
          <span className="text-sm text-muted-foreground">{logs.length} de {total}</span>
          <Button size="sm" variant="outline" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
