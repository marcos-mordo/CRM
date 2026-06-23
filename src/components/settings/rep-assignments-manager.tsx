'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, X } from 'lucide-react';
import { initials } from '@/lib/utils';
import { deleteRepAssignment, upsertRepAssignment } from '@/app/(dashboard)/settings/rep-assignments/actions';
import type { Brand, RepBrandAssignment, User } from '@prisma/client';

interface Props {
  users: User[];
  brands: Brand[];
  assignments: RepBrandAssignment[];
}

export function RepAssignmentsManager({ users, brands, assignments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ userId: string; brandId: string } | null>(null);
  const [territory, setTerritory] = useState('');
  const [commType, setCommType] = useState<string>('_inherit');
  const [commValue, setCommValue] = useState('');

  const map = new Map<string, RepBrandAssignment>();
  for (const a of assignments) map.set(`${a.userId}:${a.brandId}`, a);

  const toggle = (userId: string, brandId: string) => {
    const existing = map.get(`${userId}:${brandId}`);
    startTransition(async () => {
      try {
        if (existing) {
          await deleteRepAssignment(userId, brandId);
          toast.success('Asignación eliminada');
        } else {
          await upsertRepAssignment({ userId, brandId });
          toast.success('Asignación creada');
        }
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const startEdit = (userId: string, brandId: string) => {
    const existing = map.get(`${userId}:${brandId}`);
    setEditing({ userId, brandId });
    setTerritory(existing?.territory ?? '');
    setCommType(existing?.customCommissionType ?? '_inherit');
    setCommValue(existing?.customCommissionValue ? String(Number(existing.customCommissionValue)) : '');
  };

  const saveEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      try {
        await upsertRepAssignment({
          userId: editing.userId,
          brandId: editing.brandId,
          territory: territory || undefined,
          customCommissionType: commType === '_inherit' ? null : (commType as any),
          customCommissionValue: commValue ? Number(commValue) : null,
        });
        toast.success('Asignación actualizada');
        setEditing(null);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  if (brands.length === 0 || users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Necesitas al menos una marca y un usuario activo.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Representante</TableHead>
              {brands.map((b) => (
                <TableHead key={b.id} className="text-center min-w-[100px]">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {b.defaultCommissionType === 'PERCENTAGE'
                      ? `${Number(b.defaultCommissionValue)}%`
                      : `${Number(b.defaultCommissionValue)}€`}
                  </p>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role.toLowerCase()}</p>
                    </div>
                  </div>
                </TableCell>
                {brands.map((b) => {
                  const a = map.get(`${u.id}:${b.id}`);
                  const hasOverride = a?.customCommissionType !== null && a?.customCommissionType !== undefined;
                  return (
                    <TableCell key={b.id} className="text-center">
                      {a ? (
                        <button
                          onClick={() => startEdit(u.id, b.id)}
                          className="h-8 w-8 mx-auto rounded-md bg-success/10 hover:bg-success/20 text-success flex items-center justify-center"
                          title="Editar asignación"
                        >
                          <Check className="h-4 w-4" />
                          {hasOverride && (
                            <Badge variant="warning" className="absolute -mt-7 ml-7 text-[8px] px-1 h-3">!</Badge>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggle(u.id, b.id)}
                          className="h-8 w-8 mx-auto rounded-md border-2 border-dashed border-muted hover:border-primary hover:bg-accent flex items-center justify-center"
                          title="Asignar"
                          disabled={isPending}
                        >
                          <span className="text-xs text-muted-foreground">+</span>
                        </button>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <div className="mt-4 border rounded-lg p-4 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {users.find((u) => u.id === editing.userId)?.name} ↔ {brands.find((b) => b.id === editing.brandId)?.name}
            </p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Territorio</label>
              <Input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Madrid, Sur, Online..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Override comisión</label>
              <Select value={commType} onValueChange={setCommType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_inherit">Heredar de marca</SelectItem>
                  <SelectItem value="PERCENTAGE">% sobre venta</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Cantidad fija</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Valor</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={commValue}
                onChange={(e) => setCommValue(e.target.value)}
                disabled={commType === '_inherit'}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!editing) return;
                if (!confirm('¿Quitar esta asignación?')) return;
                startTransition(async () => {
                  await deleteRepAssignment(editing.userId, editing.brandId);
                  toast.success('Eliminada');
                  setEditing(null);
                  router.refresh();
                });
              }}
            >
              Quitar asignación
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
