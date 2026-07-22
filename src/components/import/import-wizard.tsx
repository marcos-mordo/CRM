'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { previewImport, runImport } from '@/app/(dashboard)/import/actions';

interface Field { key: string; label: string; required?: boolean; }
interface EntityDef { key: string; label: string; fields: Field[]; }

interface Preview { headers: string[]; rows: string[][]; total: number; truncated: boolean; mapping: Record<string, string>; }
interface Result { created: number; skipped: number; errors: string[]; }

const NONE = '__none__';

export function ImportWizard({ entities }: { entities: EntityDef[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entityKey, setEntityKey] = useState(entities[0].key);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  const entity = entities.find((e) => e.key === entityKey)!;

  const onFile = (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      try {
        const p = await previewImport(entityKey, fd);
        setPreview(p);
        setMapping(p.mapping);
        setStep(2);
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const doImport = () => {
    if (!preview) return;
    startTransition(async () => {
      try {
        const r = await runImport(entityKey, mapping, preview.headers, preview.rows);
        setResult(r);
        setStep(3);
        if (r.created > 0) toast.success(`${r.created} registros importados`);
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const reset = () => { setStep(1); setPreview(null); setMapping({}); setResult(null); };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[{ n: 1, t: 'Subir fichero' }, { n: 2, t: 'Mapear columnas' }, { n: 3, t: 'Resultado' }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${step >= s.n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s.n}</span>
            <span className={step >= s.n ? 'font-medium' : 'text-muted-foreground'}>{s.t}</span>
            {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">¿Qué quieres importar?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {entities.map((e) => (
                <button
                  key={e.key}
                  onClick={() => setEntityKey(e.key)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition ${entityKey === e.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-accent/50 transition">
              {pending ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
              <div className="text-center">
                <p className="font-medium">Arrastra o selecciona un Excel (.xlsx) o CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Detectaremos las columnas automáticamente. Puedes migrar desde Salesforce, HubSpot, Zoho o cualquier hoja de cálculo.</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={pending}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {step === 2 && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Mapea las columnas de tu fichero
              <Badge variant="secondary" className="ml-auto">{preview.total} filas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Empareja cada campo de BrandHub con una columna de tu fichero. Hemos rellenado lo que hemos reconocido.
            </p>

            <div className="space-y-2">
              {entity.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-sm font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={mapping[f.key] ?? NONE}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === NONE ? '' : e.target.value }))}
                  >
                    <option value={NONE}>— No importar —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Vista previa */}
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>{entity.fields.filter((f) => mapping[f.key]).map((f) => <th key={f.key} className="text-left p-2 font-medium">{f.label}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 3).map((row, i) => {
                    const idx = new Map(preview.headers.map((h, j) => [h, j]));
                    return (
                      <tr key={i} className="border-t">
                        {entity.fields.filter((f) => mapping[f.key]).map((f) => (
                          <td key={f.key} className="p-2 truncate max-w-[160px]">{row[idx.get(mapping[f.key])!] ?? ''}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}><ArrowLeft className="h-4 w-4" /> Atrás</Button>
              <Button onClick={doImport} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Importar {preview.total} filas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && result && (
        <Card>
          <CardContent className="p-8 space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <p className="text-2xl font-bold">{result.created} importados</p>
              {result.skipped > 0 && <p className="text-sm text-muted-foreground">{result.skipped} omitidos (ya existían)</p>}
            </div>
            {result.errors.length > 0 && (
              <div className="text-left bg-amber-500/10 rounded-md p-3 max-h-40 overflow-y-auto">
                <p className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                  <AlertTriangle className="h-4 w-4" /> {result.errors.length} filas con incidencias
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 20 && <li>… y {result.errors.length - 20} más</li>}
                </ul>
              </div>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={reset}>Importar otro fichero</Button>
              <Button onClick={() => router.push(`/${entityKey}`)}>Ver {entity.label.toLowerCase()}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
