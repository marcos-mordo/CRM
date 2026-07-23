'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createCustomField, deleteCustomField, reorderCustomField, updateCustomField } from '@/app/(dashboard)/settings/custom-fields/actions';

interface Field { id: string; entity: string; key: string; label: string; type: string; options: string[]; required: boolean; helpText: string | null; active: boolean; order: number }

const ENTITIES = [
  { value: 'CONTACT', label: 'Contactos' },
  { value: 'COMPANY', label: 'Empresas' },
  { value: 'DEAL', label: 'Oportunidades' },
  { value: 'LEAD', label: 'Leads' },
];
const TYPES = [
  { value: 'STRING', label: 'Texto corto' },
  { value: 'TEXT', label: 'Texto largo' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'DATE', label: 'Fecha' },
  { value: 'BOOLEAN', label: 'Sí / No' },
  { value: 'SELECT', label: 'Lista desplegable' },
  { value: 'MULTISELECT', label: 'Selección múltiple' },
];

export function CustomFieldsManager({ fields }: { fields: Field[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entity, setEntity] = useState('CONTACT');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('STRING');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  const forEntity = fields.filter((f) => f.entity === entity).sort((a, b) => a.order - b.order);
  const needsOptions = type === 'SELECT' || type === 'MULTISELECT';

  const run = (fn: () => Promise<any>, ok?: string) => startTransition(async () => {
    try { await fn(); if (ok) toast.success(ok); router.refresh(); } catch (e: any) { toast.error(e.message); }
  });

  const add = () => {
    if (!label.trim()) { toast.error('Escribe una etiqueta'); return; }
    const options = needsOptions ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined;
    if (needsOptions && (!options || options.length === 0)) { toast.error('Añade al menos una opción (separadas por comas)'); return; }
    run(() => createCustomField({ entity: entity as any, label, type: type as any, options, required, helpText: undefined }), 'Campo creado');
    setLabel(''); setOptionsText(''); setRequired(false);
  };

  const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="space-y-6">
      {/* Selector de entidad */}
      <div className="flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <button
            key={e.value}
            onClick={() => setEntity(e.value)}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${entity === e.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
          >
            {e.label}
            <Badge variant="secondary" className="ml-2 h-5">{fields.filter((f) => f.entity === e.value).length}</Badge>
          </button>
        ))}
      </div>

      {/* Alta de campo */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nuevo campo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Etiqueta</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Presupuesto anual" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4" /> Obligatorio
              </label>
            </div>
          </div>
          {needsOptions && (
            <div>
              <Label>Opciones (separadas por comas)</Label>
              <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Bronce, Plata, Oro" />
            </div>
          )}
          <Button onClick={add} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Añadir campo
          </Button>
        </CardContent>
      </Card>

      {/* Lista de campos de la entidad */}
      <Card>
        <CardHeader><CardTitle className="text-base">Campos de {ENTITIES.find((e) => e.value === entity)?.label}</CardTitle></CardHeader>
        <CardContent>
          {forEntity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin campos personalizados todavía.</p>
          ) : (
            <ul className="divide-y">
              {forEntity.map((f, i) => (
                <li key={f.id} className={`flex items-center gap-3 py-2.5 ${!f.active ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={i === 0 || pending} onClick={() => run(() => reorderCustomField(f.id, -1))}><ChevronUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={i === forEntity.length - 1 || pending} onClick={() => run(() => reorderCustomField(f.id, 1))}><ChevronDown className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.label} {f.required && <span className="text-red-500">*</span>}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel(f.type)} · clave <code>{f.key}</code>{f.options.length > 0 ? ` · ${f.options.length} opciones` : ''}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending} title={f.active ? 'Ocultar' : 'Activar'} onClick={() => run(() => updateCustomField(f.id, { active: !f.active }))}>
                    {f.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={pending} onClick={() => { if (confirm('¿Eliminar el campo y todos sus valores?')) run(() => deleteCustomField(f.id), 'Campo eliminado'); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
