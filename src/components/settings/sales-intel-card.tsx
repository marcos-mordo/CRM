'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Save, Loader2 } from 'lucide-react';
import { updateSalesIntel } from '@/app/(dashboard)/settings/actions';

export function SalesIntelCard({ rottingDays, roundRobinEnabled }: { rottingDays: number; roundRobinEnabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(String(rottingDays));
  const [rr, setRr] = useState(roundRobinEnabled);

  const save = () => {
    startTransition(async () => {
      try {
        await updateSalesIntel({ rottingDays: Number(days), roundRobinEnabled: rr });
        toast.success('Guardado');
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> Inteligencia de ventas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label>Deals se "pudren" tras</Label>
            <p className="text-xs text-muted-foreground">Días sin actividad antes de marcar un deal en riesgo en el pipeline</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="w-20" />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <Label>Reparto automático de leads (round-robin)</Label>
            <p className="text-xs text-muted-foreground">Los leads nuevos de web se asignan por turnos entre tus representantes</p>
          </div>
          <Switch checked={rr} onCheckedChange={setRr} />
        </div>

        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
