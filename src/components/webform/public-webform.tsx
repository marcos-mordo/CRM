'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

type Field = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
};

export function PublicWebForm({ form, orgName }: { form: any; orgName: string }) {
  const fields: Field[] = form.fields || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(`/api/form/${form.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Error');
      setStatus('ok');
      if (form.redirectUrl) {
        setTimeout(() => (window.location.href = form.redirectUrl), 1200);
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message);
    }
  };

  if (status === 'ok') {
    return (
      <Card className="max-w-md mx-auto shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold">¡Recibido!</h1>
          <p className="text-muted-foreground">{form.successMessage}</p>
          {form.redirectUrl && <p className="text-xs text-muted-foreground">Redirigiendo...</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center border-b pb-6">
        <BrandLogo size={56} className="mx-auto rounded-xl shadow mb-2" />
        <CardTitle>{form.title}</CardTitle>
        {form.description && <p className="text-sm text-muted-foreground mt-2">{form.description}</p>}
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={f.key}
                  required={f.required}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  rows={4}
                />
              ) : f.type === 'select' ? (
                <select
                  id={f.key}
                  required={f.required}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">— Selecciona —</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input
                  id={f.key}
                  type={f.type}
                  required={f.required}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}

          {status === 'error' && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={status === 'sending'}>
            {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar
          </Button>

          <p className="text-[10px] text-center text-muted-foreground pt-2 border-t">
            Enviando este formulario aceptas que <strong>{orgName}</strong> te contacte.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
