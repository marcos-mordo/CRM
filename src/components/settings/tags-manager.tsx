'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { createTag, deleteTag, updateTag } from '@/app/(dashboard)/settings/tags/actions';
import type { Tag } from '@prisma/client';

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

export function TagsManager({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState({ name: '', color: COLOR_PALETTE[10] });
  const [isPending, startTransition] = useTransition();

  const reset = () => setForm({ name: '', color: COLOR_PALETTE[10] });

  const startEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editing) await updateTag(editing.id, form);
        else await createTag(form);
        toast.success('Etiqueta guardada');
        setOpen(false);
        setEditing(null);
        reset();
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta etiqueta? Se quitará de todos los contactos que la tengan.')) return;
    startTransition(async () => {
      await deleteTag(id);
      toast.success('Eliminada');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Etiquetas</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Etiquetas reutilizables para clasificar contactos y filtrar listas.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nueva etiqueta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar etiqueta' : 'Nueva etiqueta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-8 w-8 rounded-full border-2 transition ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <Badge style={{ background: form.color, color: '#fff', border: 'none' }}>{form.name || 'etiqueta'}</Badge>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !form.name}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sin etiquetas creadas. Crea una para empezar a clasificar contactos.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <div
                key={t.id}
                className="group inline-flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-sm text-white"
                style={{ background: t.color }}
              >
                <button onClick={() => startEdit(t)} className="font-medium">{t.name}</button>
                <button
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
