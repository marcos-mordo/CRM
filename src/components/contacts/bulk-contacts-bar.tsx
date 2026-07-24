'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserCheck, Tag, Download, Trash2, X, Loader2 } from 'lucide-react';
import { bulkAssignOwner, bulkAddTag, bulkDeleteContacts, bulkExportContactsCsv } from '@/app/(dashboard)/contacts/bulk-actions';

interface Opt { id: string; name: string; color?: string }

export function BulkContactsBar({ ids, users, tags, onClear }: { ids: string[]; users: Opt[]; tags: Opt[]; onClear: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<any>, ok: string) =>
    startTransition(async () => {
      try { const r = await fn(); toast.success(typeof r?.count === 'number' ? `${ok} (${r.count})` : ok); onClear(); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });

  const exportCsv = () =>
    startTransition(async () => {
      try {
        const csv = await bulkExportContactsCsv({ ids });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `contactos-seleccion-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success(`${ids.length} contactos exportados`);
      } catch (e: any) { toast.error(e.message); }
    });

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-primary/5 px-4 py-2 flex-wrap">
      <span className="text-sm font-medium">{ids.length} seleccionados</span>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      <div className="flex-1" />

      {/* Asignar responsable */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}><UserCheck className="h-4 w-4" /> Asignar responsable</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
          <DropdownMenuLabel>Asignar a</DropdownMenuLabel>
          {users.map((u) => (
            <DropdownMenuItem key={u.id} onClick={() => run(() => bulkAssignOwner({ ids, ownerId: u.id }), `Asignados a ${u.name}`)}>
              {u.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Añadir etiqueta */}
      {tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending}><Tag className="h-4 w-4" /> Etiquetar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
            <DropdownMenuLabel>Añadir etiqueta</DropdownMenuLabel>
            {tags.map((tg) => (
              <DropdownMenuItem key={tg.id} onClick={() => run(() => bulkAddTag({ ids, tagId: tg.id }), `Etiqueta "${tg.name}" añadida`)}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: tg.color }} /> {tg.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button size="sm" variant="outline" onClick={exportCsv} disabled={pending}><Download className="h-4 w-4" /> Exportar</Button>
      <Button size="sm" variant="outline" className="text-destructive" disabled={pending}
        onClick={() => { if (confirm(`¿Eliminar ${ids.length} contactos?`)) run(() => bulkDeleteContacts({ ids }), 'Eliminados'); }}>
        <Trash2 className="h-4 w-4" /> Eliminar
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>
    </div>
  );
}
