'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SlidersHorizontal, ChevronUp, ChevronDown, RotateCcw, Check, Bookmark, Trash2, Plus } from 'lucide-react';

export interface ColumnDef { key: string; label: string }

/**
 * Menú reutilizable para elegir y ordenar las columnas visibles de una tabla,
 * y guardar/aplicar "vistas de columnas" con nombre. El estado vive en el
 * padre (normalmente vía useColumnPrefs).
 */
export function ColumnsMenu({
  columns,
  visible,
  onToggle,
  onMove,
  onReset,
  views = {},
  onSaveView,
  onApplyView,
  onDeleteView,
}: {
  columns: ColumnDef[];
  visible: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  onReset: () => void;
  views?: Record<string, any>;
  onSaveView?: (name: string) => void;
  onApplyView?: (name: string) => void;
  onDeleteView?: (name: string) => void;
}) {
  const label = (key: string) => columns.find((c) => c.key === key)?.label ?? key;
  const hidden = columns.filter((c) => !visible.includes(c.key));
  const [newView, setNewView] = useState('');
  const viewNames = Object.keys(views);
  const supportsViews = !!onSaveView;

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

        {/* Vistas de columnas con nombre */}
        {supportsViews && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs"><Bookmark className="h-3 w-3" /> Vistas guardadas</DropdownMenuLabel>
            {viewNames.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Aún no has guardado ninguna.</p>}
            {viewNames.map((name) => (
              <div key={name} className="flex items-center gap-1 px-2 py-1 text-sm">
                <button onClick={() => onApplyView?.(name)} className="flex-1 text-left truncate hover:text-primary">{name}</button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteView?.(name)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-1 px-2 py-1.5" onKeyDown={(e) => e.stopPropagation()}>
              <Input
                value={newView}
                onChange={(e) => setNewView(e.target.value)}
                placeholder="Guardar vista (columnas + filtros)"
                className="h-7 text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter' && newView.trim()) { onSaveView?.(newView); setNewView(''); } }}
              />
              <Button size="icon" className="h-7 w-7 shrink-0" disabled={!newView.trim()} onClick={() => { onSaveView?.(newView); setNewView(''); }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
