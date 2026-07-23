'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, Save, Loader2 } from 'lucide-react';
import { saveEntityCustomFields } from '@/app/(dashboard)/settings/custom-fields/save-actions';

interface FieldWithValue {
  field: { id: string; key: string; label: string; type: string; options: any; required: boolean; helpText: string | null };
  value: string | null;
}

export function CustomFieldsCard({ entity, entityId, items }: { entity: string; entityId: string; items: FieldWithValue[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(items.map((it) => [it.field.key, it.value ?? '']))
  );

  if (items.length === 0) return null;

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const save = () => startTransition(async () => {
    try {
      await saveEntityCustomFields(entity as any, entityId, values);
      toast.success('Guardado');
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
  });

  const renderInput = (it: FieldWithValue) => {
    const { key, type, options } = it.field;
    const v = values[key] ?? '';
    const opts: string[] = Array.isArray(options) ? options : [];
    switch (type) {
      case 'TEXT':
        return <textarea rows={2} value={v} onChange={(e) => set(key, e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
      case 'NUMBER':
      case 'DECIMAL':
        return <Input type="number" step={type === 'DECIMAL' ? '0.01' : '1'} value={v} onChange={(e) => set(key, e.target.value)} />;
      case 'DATE':
        return <Input type="date" value={v} onChange={(e) => set(key, e.target.value)} />;
      case 'BOOLEAN':
        return (
          <label className="flex items-center gap-2 text-sm h-9">
            <input type="checkbox" checked={v === 'true'} onChange={(e) => set(key, e.target.checked ? 'true' : 'false')} className="h-4 w-4" /> Sí
          </label>
        );
      case 'SELECT':
        return (
          <Select value={v} onValueChange={(val) => set(key, val)}>
            <SelectTrigger><SelectValue placeholder="Elegir…" /></SelectTrigger>
            <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'MULTISELECT': {
        const selected = v ? v.split(',') : [];
        const toggle = (o: string) => {
          const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
          set(key, next.join(','));
        };
        return (
          <div className="flex flex-wrap gap-1.5">
            {opts.map((o) => (
              <button key={o} type="button" onClick={() => toggle(o)}
                className={`text-xs rounded-full border px-2.5 py-1 ${selected.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                {o}
              </button>
            ))}
          </div>
        );
      }
      default:
        return <Input value={v} onChange={(e) => set(key, e.target.value)} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Campos personalizados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <div key={it.field.key} className="space-y-1">
            <Label className="text-xs">{it.field.label}{it.field.required && <span className="text-red-500"> *</span>}</Label>
            {renderInput(it)}
            {it.field.helpText && <p className="text-[11px] text-muted-foreground">{it.field.helpText}</p>}
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar campos
        </Button>
      </CardContent>
    </Card>
  );
}
