'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus } from 'lucide-react';
import { createEmailTemplate, updateEmailTemplate } from '@/app/(dashboard)/email-templates/actions';
import type { EmailTemplate } from '@prisma/client';

const STARTERS = {
  welcome: `<h1>¡Bienvenido a {{org.name}}, {{customer.firstName}}!</h1>
<p>Gracias por confiar en nosotros. Estamos para ayudarte con cualquier duda.</p>
<p>Saludos cordiales,<br/>El equipo de {{org.name}}</p>`,
  followup: `<h2>Hola {{customer.firstName}}</h2>
<p>Te escribo para hacer un seguimiento sobre nuestra última conversación.</p>
<p>¿Tienes alguna pregunta o necesitas más información?</p>
<p>Quedo a tu disposición.</p>`,
  promo: `<h1>🎉 Oferta especial para {{customer.firstName}}</h1>
<p>Por tiempo limitado, tenemos un descuento exclusivo para ti.</p>
<p style="text-align:center;margin:30px 0;">
  <a href="https://tudominio.com" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Ver oferta</a>
</p>
<p>No te lo pierdas.</p>`,
};

interface Props {
  template?: EmailTemplate;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function EmailTemplateDialog({ template, open: ctrlOpen, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = ctrlOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: template?.name ?? '',
    subject: template?.subject ?? '',
    htmlContent: template?.htmlContent ?? STARTERS.welcome,
    category: template?.category ?? '',
    active: template?.active ?? true,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (template) await updateEmailTemplate(template.id, form);
        else await createEmailTemplate(form);
        toast.success(t('Common.saved'));
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!template && (
        <DialogTrigger asChild>
          <Button><Plus className="h-4 w-4" /> Nueva plantilla</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? `Editar — ${template.name}` : 'Nueva plantilla de email'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Bienvenida, Seguimiento..." />
            </div>
            <div className="space-y-1.5 flex items-end">
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Activa
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Asunto *</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          </div>

          {!template && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Plantilla inicial:</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, htmlContent: STARTERS.welcome })}>Bienvenida</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, htmlContent: STARTERS.followup })}>Seguimiento</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, htmlContent: STARTERS.promo })}>Promoción</Button>
            </div>
          )}

          <Tabs defaultValue="editor">
            <div className="flex items-center justify-between">
              <Label>Contenido HTML</Label>
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="editor">
              <Textarea
                rows={14}
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                className="font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-lg overflow-hidden h-[400px]">
                <iframe srcDoc={form.htmlContent} className="w-full h-full bg-white" sandbox="" />
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Variables disponibles: <code>{'{{customer.firstName}}'}</code>, <code>{'{{customer.lastName}}'}</code>, <code>{'{{customer.email}}'}</code>, <code>{'{{org.name}}'}</code>
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
