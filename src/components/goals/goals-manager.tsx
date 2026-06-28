'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { upsertGoal, deleteGoal } from '@/app/(dashboard)/goals/actions';

const METRICS = [
  { value: 'sales_count', label: 'Ventas firmadas (nº)' },
  { value: 'sales_amount', label: 'Facturación (€)' },
  { value: 'commission', label: 'Comisión (€)' },
  { value: 'deals_won', label: 'Deals ganados (nº)' },
  { value: 'calls_made', label: 'Llamadas (nº)' },
];

export function GoalsManager({
  users, period, existing,
}: {
  users: { id: string; name: string; email: string; role: string }[];
  period: string;
  existing: { id: string; userId: string; metric: string; target: any; user: { name: string } }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState(users[0]?.id ?? '');
  const [metric, setMetric] = useState('sales_amount');
  const [target, setTarget] = useState('5000');

  const save = () => {
    if (!userId) return;
    startTransition(async () => {
      try {
        await upsertGoal({ userId, period, metric: metric as any, target: Number(target) });
        toast.success('Meta guardada');
        setTarget('5000');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar meta?')) return;
    startTransition(async () => {
      await deleteGoal(id);
      toast.success('Meta eliminada');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Gestionar metas (admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Usuario</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Métrica</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Objetivo</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} min={0} />
          </div>
          <Button onClick={save} disabled={pending || !userId}>
            <Plus className="h-4 w-4" /> Guardar
          </Button>
        </div>

        {existing.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">METAS ACTUALES ({period})</p>
            <ul className="space-y-1">
              {existing.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span>{g.user.name} · {METRICS.find((m) => m.value === g.metric)?.label} → {Number(g.target).toLocaleString('es-ES')}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove(g.id)} className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
