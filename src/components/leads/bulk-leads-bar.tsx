'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserCheck, Flag, Download, Trash2, X, Loader2 } from 'lucide-react';
import { bulkAssignLeadOwner, bulkSetLeadStatus, bulkDeleteLeads, bulkExportLeadsCsv } from '@/app/(dashboard)/leads/bulk-actions';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;

export function BulkLeadsBar({ ids, users, onClear }: { ids: string[]; users: { id: string; name: string }[]; onClear: () => void }) {
  const router = useRouter();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<any>, ok: string) =>
    startTransition(async () => {
      try { const r = await fn(); toast.success(typeof r?.count === 'number' ? `${ok} (${r.count})` : ok); onClear(); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });

  const exportCsv = () =>
    startTransition(async () => {
      try {
        const csv = await bulkExportLeadsCsv({ ids });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `leads-seleccion-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success(`${ids.length} leads exportados`);
      } catch (e: any) { toast.error(e.message); }
    });

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-primary/5 px-4 py-2 flex-wrap">
      <span className="text-sm font-medium">{ids.length} seleccionados</span>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}><UserCheck className="h-4 w-4" /> Asignar</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
          <DropdownMenuLabel>Asignar a</DropdownMenuLabel>
          {users.map((u) => (
            <DropdownMenuItem key={u.id} onClick={() => run(() => bulkAssignLeadOwner({ ids, ownerId: u.id }), `Asignados a ${u.name}`)}>{u.name}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}><Flag className="h-4 w-4" /> Estado</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Marcar como</DropdownMenuLabel>
          {STATUSES.map((s) => (
            <DropdownMenuItem key={s} onClick={() => run(() => bulkSetLeadStatus({ ids, status: s as any }), 'Estado actualizado')}>
              {t(`Leads.status.${s}` as any)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline" onClick={exportCsv} disabled={pending}><Download className="h-4 w-4" /> Exportar</Button>
      <Button size="sm" variant="outline" className="text-destructive" disabled={pending}
        onClick={() => { if (confirm(`¿Eliminar ${ids.length} leads?`)) run(() => bulkDeleteLeads({ ids }), 'Eliminados'); }}>
        <Trash2 className="h-4 w-4" /> Eliminar
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>
    </div>
  );
}
