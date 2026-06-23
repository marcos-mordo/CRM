'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus } from 'lucide-react';
import { createContractTemplate, updateContractTemplate } from '@/app/(dashboard)/contract-templates/actions';
import type { Brand, ContractTemplate } from '@prisma/client';

const DEFAULT_TEMPLATE = `<h1>Contrato de prestación de servicios</h1>
<p>Entre {{brand.name}} (representada por {{org.name}}) y {{customer.name}} ({{customer.taxId}}) se acuerda lo siguiente:</p>

<h2>1. Servicios contratados</h2>
{{lines.html}}

<h2>2. Importe total</h2>
<p><strong>{{sale.total}}</strong> (IVA incluido)</p>

<h2>3. Vigencia</h2>
<p>El contrato entra en vigor el {{sale.date}} y tiene duración indefinida hasta cancelación por cualquiera de las partes con preaviso de 30 días.</p>

<h2>4. Protección de datos (RGPD)</h2>
<p>El cliente autoriza el tratamiento de sus datos personales según lo dispuesto en el RGPD (UE) 2016/679 y la LOPDGDD.</p>

<p>En {{sale.city}}, a {{sale.date}}</p>`;

interface Props {
  template?: ContractTemplate;
  brands: Brand[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function TemplateDialog({ template, brands, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: template?.name ?? '',
    brandId: template?.brandId ?? '',
    htmlContent: template?.htmlContent ?? DEFAULT_TEMPLATE,
    active: template?.active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (template) await updateContractTemplate(template.id, form);
        else await createContractTemplate(form);
        toast.success(t('Common.saved'));
        setOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!template && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? `Editar — ${template.name}` : 'Nueva plantilla de contrato'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Marca asignada</Label>
              <Select value={form.brandId || '_global'} onValueChange={(v) => setForm({ ...form, brandId: v === '_global' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_global">— Plantilla global —</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="editor">
            <div className="flex items-center justify-between">
              <Label>Contenido (HTML con variables)</Label>
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Vista previa</TabsTrigger>
                <TabsTrigger value="vars">Variables</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor">
              <Textarea
                rows={16}
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                className="font-mono text-xs"
              />
            </TabsContent>

            <TabsContent value="preview">
              <div className="border rounded-lg h-[500px] bg-white overflow-auto p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: form.htmlContent }}
              />
            </TabsContent>

            <TabsContent value="vars">
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold mb-2">Variables disponibles para sustituir:</p>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>{'{{org.name}}'}</code> — Nombre de tu agencia</li>
                  <li><code>{'{{brand.name}}'}</code> — Nombre de la marca</li>
                  <li><code>{'{{brand.legalName}}'}</code> — Razón social de la marca</li>
                  <li><code>{'{{customer.name}}'}</code> — Nombre del cliente</li>
                  <li><code>{'{{customer.taxId}}'}</code> — DNI o CIF</li>
                  <li><code>{'{{customer.email}}'}</code> — Email del cliente</li>
                  <li><code>{'{{customer.address}}'}</code> — Dirección</li>
                  <li><code>{'{{sale.number}}'}</code> — Número de venta</li>
                  <li><code>{'{{sale.date}}'}</code> — Fecha venta</li>
                  <li><code>{'{{sale.total}}'}</code> — Total formateado</li>
                  <li><code>{'{{sale.city}}'}</code> — Ciudad del cliente</li>
                  <li><code>{'{{lines.html}}'}</code> — Tabla HTML de líneas</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Las variables se sustituyen al generar el PDF del contrato.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Plantilla activa
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('Common.save')}
              {template && ` (v${template.version + 1})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
