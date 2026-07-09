'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Timer, Save, Loader2 } from 'lucide-react';
import { saveSlaPolicies } from '@/app/(dashboard)/tickets/actions';

type Row = { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; firstResponseMins: number; resolutionMins: number };

const LABELS: Record<string, { label: string; variant: any }> = {
  URGENT: { label: 'Urgente', variant: 'destructive' },
  HIGH:   { label: 'Alta',    variant: 'warning' },
  MEDIUM: { label: 'Media',   variant: 'default' },
  LOW:    { label: 'Baja',    variant: 'secondary' },
};

export function SlaSettingsButton({ current, configured }: { current: Row[]; configured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(current);

  const setRow = (priority: string, field: 'firstResponseMins' | 'resolutionMins', hours: number) => {
    setRows(rows.map((r) => (r.priority === priority ? { ...r, [field]: Math.round(hours * 60) } : r)));
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveSlaPolicies(rows);
        toast.success('Política SLA guardada');
        setOpen(false);
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Timer className="h-4 w-4" /> SLA {!configured && <span className="text-[10px] text-muted-foreground">(sin configurar)</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Política SLA</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tiempos máximos por prioridad. Los tickets mostrarán un aviso ámbar en el
          último 25% del plazo y rojo si se incumple.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
            <span>Prioridad</span>
            <span>1ª respuesta (horas)</span>
            <span>Resolución (horas)</span>
          </div>
          {rows.map((r) => (
            <div key={r.priority} className="grid grid-cols-3 gap-2 items-center">
              <Badge variant={LABELS[r.priority].variant} className="justify-center">{LABELS[r.priority].label}</Badge>
              <Input
                type="number" min={0.5} step={0.5}
                value={r.firstResponseMins / 60}
                onChange={(e) => setRow(r.priority, 'firstResponseMins', Number(e.target.value))}
              />
              <Input
                type="number" min={1} step={1}
                value={r.resolutionMins / 60}
                onChange={(e) => setRow(r.priority, 'resolutionMins', Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar política
        </Button>
      </DialogContent>
    </Dialog>
  );
}
