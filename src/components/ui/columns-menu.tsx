'use client';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SlidersHorizontal, ChevronUp, ChevronDown, RotateCcw, Check } from 'lucide-react';

export interface ColumnDef { key: string; label: string }

/**
 * Menú reutilizable para elegir y ordenar las columnas visibles de una tabla.
 * El estado vive en el padre (normalmente vía useColumnPrefs).
 */
export function ColumnsMenu({
  columns,
  visible,
  onToggle,
  onMove,
  onReset,
}: {
  columns: ColumnDef[];
  visible: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  onReset: () => void;
}) {
  const label = (key: string) => columns.find((c) => c.key === key)?.label ?? key;
  const hidden = columns.filter((c) => !visible.includes(c.key));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-4 w-4" /> Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          Columnas visibles
          <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Restablecer
          </button>
        </DropdownMenuLabel>
        {/* Visibles (ordenables) */}
        {visible.map((key, i) => (
          <div key={key} className="flex items-center gap-1 px-2 py-1 text-sm">
            <button onClick={() => onToggle(key)} className="flex items-center gap-2 flex-1 text-left" disabled={visible.length === 1}>
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{label(key)}</span>
            </button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => onMove(key, -1)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === visible.length - 1} onClick={() => onMove(key, 1)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {/* Ocultas */}
        {hidden.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Ocultas</DropdownMenuLabel>
            {hidden.map((c) => (
              <button key={c.key} onClick={() => onToggle(c.key)} className="flex items-center gap-2 px-2 py-1 text-sm w-full text-left text-muted-foreground hover:text-foreground">
                <span className="h-3.5 w-3.5" />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
