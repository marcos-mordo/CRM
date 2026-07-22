'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

/**
 * Botón universal de exportación. `entity` debe existir en EXPORTS
 * (src/lib/export-registry.ts). Exporta TODA la información del módulo a Excel
 * (.xlsx) o CSV, sin límites de registros.
 */
export function ExportButton({ entity, label = 'Exportar', size = 'sm' }: { entity: string; label?: string; size?: 'sm' | 'default' }) {
  const [busy, setBusy] = useState(false);

  const download = (format: 'xlsx' | 'csv') => {
    setBusy(true);
    // Navegar a la URL de descarga; el navegador gestiona el attachment sin
    // abandonar la página.
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/api/export/${entity}?format=${format}`;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      setBusy(false);
    }, 3000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download('xlsx')}>
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('csv')}>
          <FileText className="h-4 w-4 text-blue-600" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
