'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { createOrganization, switchToOrg } from '@/app/(dashboard)/organizations/actions';
import { cn } from '@/lib/utils';

interface Props {
  organizations: { id: string; name: string; slug: string; role: string; isDefault: boolean }[];
  currentOrgId: string;
}

export function OrganizationSwitcher({ organizations, currentOrgId }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();

  const current = organizations.find((o) => o.id === currentOrgId) ?? organizations[0];

  const switchTo = (id: string) => {
    if (id === currentOrgId) return;
    startTransition(async () => {
      try {
        await switchToOrg(id);
        toast.success('Cambiando de organización…');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createOrganization({ name: newName });
        toast.success('Organización creada');
        setCreateOpen(false);
        setNewName('');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2 max-w-[200px]">
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="text-left min-w-0 hidden sm:block">
              <p className="text-sm font-semibold truncate leading-tight">{current?.name ?? '?'}</p>
              {current?.role && <p className="text-[10px] text-muted-foreground capitalize leading-tight">{current.role.toLowerCase()}</p>}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs">Tus organizaciones</DropdownMenuLabel>
          {organizations.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => switchTo(o.id)} disabled={isPending}>
              <div className={cn('h-7 w-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0', o.id === currentOrgId ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {o.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{o.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground capitalize">{o.role.toLowerCase()}</span>
                  {o.isDefault && <Badge variant="outline" className="text-[9px] px-1 h-3">default</Badge>}
                </div>
              </div>
              {o.id === currentOrgId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Crear organización
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva organización</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required minLength={2} autoFocus />
            </div>
            <p className="text-xs text-muted-foreground">
              Serás OWNER de esta nueva organización con datos y catálogo aislados.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending || newName.length < 2}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear y cambiar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
