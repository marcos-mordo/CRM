'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, ExternalLink, Trash2, Code2 } from 'lucide-react';
import { createWebForm, deleteWebForm } from '@/app/(dashboard)/web-forms/actions';

export function WebFormsManager({ forms }: { forms: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Contáctanos');
  const [emails, setEmails] = useState('');

  const create = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createWebForm({ name, title, notifyEmails: emails });
        toast.success('Formulario creado');
        setOpen(false); setName(''); setEmails('');
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar este formulario?')) return;
    startTransition(async () => {
      await deleteWebForm(id);
      router.refresh();
    });
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const copyEmbed = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    const code = `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border:0;border-radius:12px;"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success('Código embed copiado');
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo formulario</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo formulario web</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nombre interno</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contacto web principal" />
              </div>
              <div>
                <Label>Título público</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contáctanos" />
              </div>
              <div>
                <Label>Emails para notificaciones (separados por coma)</Label>
                <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ventas@empresa.com" />
              </div>
              <Button onClick={create} disabled={pending}>Crear</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          Aún no hay formularios. Crea uno para embeberlo en tu web.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f) => (
            <Card key={f.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{f.name}</CardTitle>
                <Badge variant={f.active ? 'success' : 'secondary'}>{f.active ? 'Activo' : 'Pausado'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{f.title}</p>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span><strong>{f.submissions}</strong> envíos</span>
                  {f.owner && <span>· propietario: {f.owner.name}</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => copyLink(f.slug)}>
                    <Copy className="h-3 w-3" /> Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyEmbed(f.slug)}>
                    <Code2 className="h-3 w-3" /> Embed
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/form/${f.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> Ver
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)} className="ml-auto text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
