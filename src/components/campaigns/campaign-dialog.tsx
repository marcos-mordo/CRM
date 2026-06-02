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
import { createCampaign } from '@/app/(dashboard)/campaigns/actions';
import type { EmailList } from '@prisma/client';

interface Props {
  lists: (EmailList & { _count: { members: number } })[];
  userEmail: string;
  userName: string;
}

const TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Newsletter</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:30px;color:#ffffff;">
              <h1 style="margin:0;font-size:24px;">Hola,</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:#334155;font-size:15px;line-height:1.6;">
              <p>Este es el cuerpo de tu campaña. Edita este HTML con el contenido que quieras enviar a tus contactos.</p>
              <p>Puedes incluir links, imágenes y formato HTML libremente.</p>
              <p style="text-align:center;margin-top:30px;">
                <a href="https://tudominio.com" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Llamada a la acción</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;">
              Recibes este email porque estás en nuestra lista. <a href="#" style="color:#94a3b8;">Cancelar suscripción</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function CampaignDialog({ lists, userEmail, userName }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: '',
    subject: '',
    fromName: userName,
    fromEmail: userEmail,
    htmlContent: TEMPLATE_HTML,
    listIds: [] as string[],
  });

  const toggleList = (id: string) => {
    setForm({
      ...form,
      listIds: form.listIds.includes(id) ? form.listIds.filter((x) => x !== id) : [...form.listIds, id],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.listIds.length === 0) return toast.error('Selecciona al menos una lista');
    startTransition(async () => {
      try {
        await createCampaign(form);
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t('Campaigns.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Campaigns.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Common.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Campaigns.subject')} *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('Campaigns.fromName')} *</Label>
              <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Campaigns.fromEmail')} *</Label>
              <Input type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('Campaigns.lists')} *</Label>
            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
              {lists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay listas. Crea una primero.</p>
              ) : (
                lists.map((list) => (
                  <label key={list.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded text-sm cursor-pointer">
                    <input type="checkbox" checked={form.listIds.includes(list.id)} onChange={() => toggleList(list.id)} />
                    <span className="flex-1">{list.name}</span>
                    <span className="text-xs text-muted-foreground">{list._count.members} contactos</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Tabs defaultValue="editor">
              <div className="flex items-center justify-between">
                <Label>Contenido (HTML)</Label>
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">{t('Campaigns.preview')}</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="editor">
                <Textarea
                  rows={10}
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
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar como borrador
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
