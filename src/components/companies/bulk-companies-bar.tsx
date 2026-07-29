'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Download, Trash2, X, Loader2 } from 'lucide-react';
import { bulkDeleteCompanies, bulkExportCompaniesCsv } from '@/app/(dashboard)/companies/bulk-actions';

export function BulkCompaniesBar({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const del = () => {
    if (!confirm(`¿Eliminar ${ids.length} empresas?`)) return;
    startTransition(async () => {
      try { const r = await bulkDeleteCompanies({ ids }); toast.success(`Eliminadas (${r.count})`); onClear(); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  };

  const exportCsv = () =>
    startTransition(async () => {
      try {
        const csv = await bulkExportCompaniesCsv({ ids });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `empresas-seleccion-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success(`${ids.length} empresas exportadas`);
      } catch (e: any) { toast.error(e.message); }
    });

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-primary/5 px-4 py-2 flex-wrap">
      <span className="text-sm font-medium">{ids.length} seleccionadas</span>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      <div className="flex-1" />
      <Button size="sm" variant="outline" onClick={exportCsv} disabled={pending}><Download className="h-4 w-4" /> Exportar</Button>
      <Button size="sm" variant="outline" className="text-destructive" onClick={del} disabled={pending}><Trash2 className="h-4 w-4" /> Eliminar</Button>
      <Button size="sm" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>
    </div>
  );
}
