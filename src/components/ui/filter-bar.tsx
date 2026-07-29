'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Filter, Plus, X } from 'lucide-react';
import { OPERATORS, type FilterField, type FilterCondition } from '@/lib/table-filters';

/**
 * Barra de filtros avanzados reutilizable (estilo HubSpot): añade condiciones
 * campo + operador + valor, se combinan con AND. El estado vive en el padre.
 */
export function FilterBar({ fields, filters, onChange }: { fields: FilterField[]; filters: FilterCondition[]; onChange: (f: FilterCondition[]) => void }) {
  const [adding, setAdding] = useState(false);
  const fieldOf = (key: string) => fields.find((f) => f.key === key);

  const addField = (key: string) => {
    const f = fieldOf(key);
    if (!f) return;
    const op = OPERATORS[f.type][0].value;
    onChange([...filters, { field: key, op, value: f.type === 'select' ? (f.options?.[0]?.value ?? '') : '' }]);
    setAdding(false);
  };
  const update = (i: number, patch: Partial<FilterCondition>) => onChange(filters.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(filters.filter((_, j) => j !== i));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((c, i) => {
        const f = fieldOf(c.field);
        if (!f) return null;
        const ops = OPERATORS[f.type];
        const needsValue = c.op !== 'empty';
        return (
          <div key={i} className="flex items-center gap-1 rounded-md border bg-muted/40 pl-2 pr-1 py-1 text-xs">
            <span className="font-medium">{f.label}</span>
            <select className="bg-transparent outline-none" value={c.op} onChange={(e) => update(i, { op: e.target.value })}>
              {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {needsValue && (
              f.type === 'select' ? (
                <select className="bg-background rounded border px-1 py-0.5" value={c.value} onChange={(e) => update(i, { value: e.target.value })}>
                  {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={c.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="h-6 w-28 text-xs px-1"
                />
              )
            )}
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
          </div>
        );
      })}

      <DropdownMenu open={adding} onOpenChange={setAdding}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline"><Filter className="h-3.5 w-3.5" /> {filters.length > 0 ? 'Añadir filtro' : 'Filtros'}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
          {fields.map((f) => (
            <DropdownMenuItem key={f.key} onClick={() => addField(f.key)}><Plus className="h-3.5 w-3.5" /> {f.label}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {filters.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => onChange([])} className="text-muted-foreground">Limpiar</Button>
      )}
    </div>
  );
}
