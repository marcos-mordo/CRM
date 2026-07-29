'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '@/lib/sort-rows';

/** Contenido de una cabecera de tabla ordenable: etiqueta + indicador de orden.
 *  Si `sortable` es false, se muestra la etiqueta sin interacción. */
export function SortableHead({ label, active, dir, sortable, onToggle }: {
  label: string; active: boolean; dir: SortDir; sortable: boolean; onToggle: () => void;
}) {
  if (!sortable) return <>{label}</>;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 hover:text-foreground select-none -my-1 py-1"
      title="Ordenar"
    >
      {label}
      {active && dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" />
        : active && dir === 'desc' ? <ChevronDown className="h-3.5 w-3.5" />
        : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
    </button>
  );
}
