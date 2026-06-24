'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bookmark, BookmarkPlus, Globe, Loader2, Trash2, User as UserIcon } from 'lucide-react';
import { createSavedView, deleteSavedView } from '@/app/(dashboard)/saved-views/actions';
import type { SavedView, SavedViewEntity } from '@prisma/client';

interface Props {
  views: (SavedView & { user: { id: string; name: string } })[];
  entity: SavedViewEntity;
  currentUserId: string;
  basePath: string; // ej: /sales-orders
}

export function SavedViewsBar({ views, entity, currentUserId, basePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.toString();
  const hasActiveFilters = currentQuery.length > 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasActiveFilters) return toast.error('Aplica filtros antes de guardar la vista');
    startTransition(async () => {
      try {
        await createSavedView({ name, entity, query: currentQuery, shared });
        toast.success('Vista guardada');
        setOpen(false);
        setName('');
        setShared(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const apply = (q: string) => {
    router.push(`${basePath}?${q}`);
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta vista?')) return;
    startTransition(async () => {
      try {
        await deleteSavedView(id);
        toast.success('Vista eliminada');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  if (views.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 border-b bg-muted/30">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
      {views.map((v) => {
        const isMine = v.userId === currentUserId;
        return (
          <div key={v.id} className="group inline-flex items-center gap-1">
            <button
              onClick={() => apply(v.query)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-card border hover:bg-accent transition"
              title={v.shared ? 'Vista compartida' : 'Vista personal'}
            >
              {v.shared ? <Globe className="h-3 w-3 text-blue-500" /> : <UserIcon className="h-3 w-3 text-muted-foreground" />}
              <span className="font-medium">{v.name}</span>
              {v.shared && !isMine && (
                <Badge variant="outline" className="text-[9px] py-0 px-1">{v.user.name.split(' ')[0]}</Badge>
              )}
            </button>
            {isMine && (
              <button
                onClick={() => remove(v.id)}
                className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-destructive/10 flex items-center justify-center"
                title="Eliminar vista"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            )}
          </div>
        );
      })}

      {hasActiveFilters && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <BookmarkPlus className="h-3 w-3" /> Guardar vista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar vista actual</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis pendientes urgentes" required />
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Filtros actuales: <code className="break-all">?{currentQuery}</code>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
                Compartir con todo el equipo
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !name}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
