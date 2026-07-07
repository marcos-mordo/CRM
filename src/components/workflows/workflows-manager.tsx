'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Plus, Trash2, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { createWorkflow, toggleWorkflow, deleteWorkflow } from '@/app/(dashboard)/workflows/actions';
import { formatDate } from '@/lib/utils';

const TRIGGERS = [
  { value: 'SALE_SIGNED',         label: '✍️ Cuando se firma una venta' },
  { value: 'SALE_CREATED',        label: '🛒 Cuando se crea una venta' },
  { value: 'SALE_CANCELLED',      label: '❌ Cuando se cancela una venta' },
  { value: 'LEAD_CREATED',        label: '🎯 Cuando llega un lead nuevo' },
  { value: 'CUSTOMER_CREATED',    label: '👤 Cuando se crea un cliente' },
  { value: 'COMMISSION_APPROVED', label: '✅ Cuando se aprueba una comisión' },
  { value: 'COMMISSION_PAID',     label: '💰 Cuando se paga una comisión' },
];

const ACTION_TYPES = [
  { value: 'create_task',     label: '📋 Crear una tarea' },
  { value: 'notify_managers', label: '🔔 Avisar a los managers' },
  { value: 'send_email',      label: '📧 Enviar un email' },
  { value: 'http_webhook',    label: '🌐 Llamar a una URL (webhook)' },
];

const FIELDS_HINT = 'Variables disponibles: {{number}}, {{total}}, {{customerName}}, {{brandName}}, {{representativeName}}, {{firstName}}, {{lastName}}, {{email}}, {{source}}';

type DraftAction = { type: string; params: Record<string, string> };

export function WorkflowsManager({ workflows }: { workflows: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // form state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('SALE_SIGNED');
  const [useCondition, setUseCondition] = useState(false);
  const [condField, setCondField] = useState('total');
  const [condOp, setCondOp] = useState('gt');
  const [condValue, setCondValue] = useState('');
  const [actions, setActions] = useState<DraftAction[]>([{ type: 'notify_managers', params: { title: '' } }]);

  const addAction = () => {
    if (actions.length >= 5) return;
    setActions([...actions, { type: 'create_task', params: { title: '' } }]);
  };

  const setAction = (idx: number, patch: Partial<DraftAction>) => {
    setActions(actions.map((a, i) => (i === idx ? { ...a, ...patch, params: patch.params ?? a.params } : a)));
  };

  const setParam = (idx: number, key: string, value: string) => {
    setActions(actions.map((a, i) => (i === idx ? { ...a, params: { ...a.params, [key]: value } } : a)));
  };

  const save = () => {
    if (!name.trim()) { toast.error('Ponle un nombre'); return; }
    startTransition(async () => {
      try {
        await createWorkflow({
          name,
          trigger: trigger as any,
          conditions: useCondition && condValue ? [{ field: condField, op: condOp as any, value: condValue }] : [],
          actions: actions.map((a) => ({ type: a.type, params: a.params })) as any,
        });
        toast.success('Automatización creada');
        setOpen(false);
        setName(''); setActions([{ type: 'notify_managers', params: { title: '' } }]); setUseCondition(false); setCondValue('');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const toggle = (id: string, active: boolean) => {
    startTransition(async () => {
      await toggleWorkflow(id, active);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta automatización?')) return;
    startTransition(async () => {
      await deleteWorkflow(id);
      toast.success('Eliminada');
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nueva automatización</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Nueva automatización</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aviso de venta grande" />
              </div>

              <div>
                <Label className="text-base font-semibold">1 · Cuándo</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">2 · Solo si… (opcional)</Label>
                  <Switch checked={useCondition} onCheckedChange={setUseCondition} />
                </div>
                {useCondition && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input value={condField} onChange={(e) => setCondField(e.target.value)} placeholder="campo (ej: total)" />
                    <Select value={condOp} onValueChange={setCondOp}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gt">mayor que</SelectItem>
                        <SelectItem value="lt">menor que</SelectItem>
                        <SelectItem value="eq">igual a</SelectItem>
                        <SelectItem value="neq">distinto de</SelectItem>
                        <SelectItem value="contains">contiene</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={condValue} onChange={(e) => setCondValue(e.target.value)} placeholder="valor (ej: 1000)" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-semibold">3 · Entonces…</Label>
                <div className="space-y-3 mt-2">
                  {actions.map((a, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
                      {actions.length > 1 && (
                        <button
                          onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Select value={a.type} onValueChange={(v) => setAction(idx, { type: v, params: {} })}>
                        <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {a.type === 'create_task' && (
                        <Input value={a.params.title ?? ''} onChange={(e) => setParam(idx, 'title', e.target.value)}
                          placeholder="Título de la tarea, ej: Llamar a {{customerName}}" />
                      )}
                      {a.type === 'notify_managers' && (
                        <>
                          <Input value={a.params.title ?? ''} onChange={(e) => setParam(idx, 'title', e.target.value)}
                            placeholder="Título, ej: Venta grande: {{number}}" />
                          <Input value={a.params.message ?? ''} onChange={(e) => setParam(idx, 'message', e.target.value)}
                            placeholder="Mensaje (opcional), ej: {{total}}€ de {{customerName}}" />
                        </>
                      )}
                      {a.type === 'send_email' && (
                        <>
                          <Input value={a.params.to ?? ''} onChange={(e) => setParam(idx, 'to', e.target.value)}
                            placeholder="destinatario@empresa.com" type="email" />
                          <Input value={a.params.subject ?? ''} onChange={(e) => setParam(idx, 'subject', e.target.value)}
                            placeholder="Asunto" />
                          <Textarea value={a.params.body ?? ''} onChange={(e) => setParam(idx, 'body', e.target.value)}
                            placeholder="Cuerpo del email. Puedes usar {{variables}}." rows={3} />
                        </>
                      )}
                      {a.type === 'http_webhook' && (
                        <Input value={a.params.url ?? ''} onChange={(e) => setParam(idx, 'url', e.target.value)}
                          placeholder="https://..." type="url" />
                      )}
                    </div>
                  ))}
                  {actions.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addAction}>
                      <Plus className="h-3 w-3" /> Otra acción
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{FIELDS_HINT}</p>
              </div>

              <Button onClick={save} disabled={pending} className="w-full">
                <Zap className="h-4 w-4" /> Crear automatización
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Zap className="h-12 w-12 mx-auto text-amber-500/50" />
            <p className="font-medium">Aún no tienes automatizaciones</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ejemplos: «cuando se firme una venta de más de 1.000€, avisa a los managers» ·
              «cuando llegue un lead, crea una tarea de llamada» ·
              «cuando se pague una comisión, envía un email a contabilidad»
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const triggerLabel = TRIGGERS.find((t) => t.value === wf.trigger)?.label ?? wf.trigger;
            const acts = (wf.actions as any[]) ?? [];
            const isOpen = expanded === wf.id;
            return (
              <Card key={wf.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Zap className={`h-5 w-5 ${wf.active ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{wf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {triggerLabel} → {acts.map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type).join(' + ')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <PlayCircle className="h-3 w-3 mr-1" /> {wf.runsCount} ejecuciones
                    </Badge>
                    <Switch checked={wf.active} onCheckedChange={(v) => toggle(wf.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => setExpanded(isOpen ? null : wf.id)} className="h-8 w-8">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(wf.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isOpen && wf.runs?.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">ÚLTIMAS EJECUCIONES</p>
                      <ul className="space-y-1">
                        {wf.runs.map((r: any) => (
                          <li key={r.id} className="text-xs flex items-start gap-2">
                            <Badge variant={r.status === 'SUCCESS' ? 'success' : r.status === 'SKIPPED' ? 'secondary' : 'destructive'} className="text-[10px] shrink-0">
                              {r.status}
                            </Badge>
                            <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                            {r.detail && <span className="truncate">{r.detail.split('\n')[0]}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {isOpen && (!wf.runs || wf.runs.length === 0) && (
                    <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">Aún no se ha ejecutado.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
