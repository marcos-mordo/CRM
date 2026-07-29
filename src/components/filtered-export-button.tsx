'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Exporta SOLO los registros indicados (lo que el usuario tiene filtrado en
 * pantalla) enviando sus IDs al endpoint de export por POST y descargando el
 * fichero. Aparece cuando hay un subconjunto filtrado.
 */
export function FilteredExportButton({ entity, ids, count }: { entity: string; ids: string[]; count: number }) {
  const [busy, setBusy] = useState(false);

  const download = async (format: 'xlsx' | 'csv') => {
    setBusy(true);
    try {
      const res = await fetch(`/api/export/${entity}?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('No se pudo exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-filtrado-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${count} registros exportados`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar {count}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download('xlsx')}><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('csv')}><FileText className="h-4 w-4 text-blue-600" /> CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
