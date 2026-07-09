'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Play, Save, Trash2, Loader2, FileBarChart } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { runReport, saveReport, deleteReport, type ReportConfig, type ReportRow } from '@/app/(dashboard)/report-builder/actions';

const ENTITIES = [
  { value: 'sales',       label: 'Ventas' },
  { value: 'commissions', label: 'Comisiones' },
  { value: 'leads',       label: 'Leads' },
  { value: 'deals',       label: 'Deals' },
  { value: 'tasks',       label: 'Tareas' },
  { value: 'tickets',     label: 'Tickets' },
];

const METRICS: Record<string, { value: string; label: string }[]> = {
  sales:       [{ value: 'count', label: 'Nº de ventas' }, { value: 'sum', label: 'Facturación (€)' }],
  commissions: [{ value: 'count', label: 'Nº de comisiones' }, { value: 'sum', label: 'Importe (€)' }],
  leads:       [{ value: 'count', label: 'Nº de leads' }, { value: 'sum', label: 'Valor estimado (€)' }],
  deals:       [{ value: 'count', label: 'Nº de deals' }, { value: 'sum', label: 'Importe (€)' }],
  tasks:       [{ value: 'count', label: 'Nº de tareas' }],
  tickets:     [{ value: 'count', label: 'Nº de tickets' }],
};

const GROUPS: Record<string, { value: string; label: string }[]> = {
  sales:       [{ value: 'brand', label: 'Marca' }, { value: 'representative', label: 'Representante' }, { value: 'status', label: 'Estado' }, { value: 'month', label: 'Mes' }],
  commissions: [{ value: 'representative', label: 'Representante' }, { value: 'status', label: 'Estado' }, { value: 'month', label: 'Mes' }],
  leads:       [{ value: 'source', label: 'Origen' }, { value: 'status', label: 'Estado' }, { value: 'month', label: 'Mes' }],
  deals:       [{ value: 'stage', label: 'Etapa' }, { value: 'owner', label: 'Propietario' }, { value: 'status', label: 'Estado' }, { value: 'month', label: 'Mes' }],
  tasks:       [{ value: 'assignee', label: 'Asignado a' }, { value: 'status', label: 'Estado' }, { value: 'priority', label: 'Prioridad' }, { value: 'month', label: 'Mes' }],
  tickets:     [{ value: 'status', label: 'Estado' }, { value: 'priority', label: 'Prioridad' }, { value: 'assignee', label: 'Asignado a' }, { value: 'month', label: 'Mes' }],
};

const PERIODS = [
  { value: '30d',  label: 'Últimos 30 días' },
  { value: '90d',  label: 'Últimos 90 días' },
  { value: 'year', label: 'Este año' },
  { value: 'all',  label: 'Todo' },
];

const CHARTS = [
  { value: 'bar',   label: 'Barras' },
  { value: 'line',  label: 'Línea' },
  { value: 'pie',   label: 'Tarta' },
  { value: 'table', label: 'Tabla' },
];

const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#DC2626', '#0891B2', '#65A30D'];

type SavedItem = { id: string; name: string; config: ReportConfig; by: string };

export function ReportBuilder({ saved }: { saved: SavedItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entity, setEntity] = useState('sales');
  const [metric, setMetric] = useState('sum');
  const [groupBy, setGroupBy] = useState('brand');
  const [period, setPeriod] = useState<'30d' | '90d' | 'year' | 'all'>('90d');
  const [chart, setChart] = useState<'bar' | 'line' | 'pie' | 'table'>('bar');
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [reportName, setReportName] = useState('');

  const onEntityChange = (e: string) => {
    setEntity(e);
    setMetric(METRICS[e][0].value);
    setGroupBy(GROUPS[e][0].value);
    setRows(null);
  };

  const config: ReportConfig = { entity: entity as any, metric: metric as any, groupBy, period, chart };

  const run = (cfg?: ReportConfig) => {
    const c = cfg ?? config;
    startTransition(async () => {
      try {
        const r = await runReport(c);
        setRows(r.rows);
        setTotal(r.total);
        if (cfg) {
          setEntity(cfg.entity); setMetric(cfg.metric); setGroupBy(cfg.groupBy);
          setPeriod(cfg.period); setChart(cfg.chart);
        }
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const save = () => {
    if (!reportName.trim()) { toast.error('Ponle nombre al informe'); return; }
    startTransition(async () => {
      try {
        await saveReport(reportName, config);
        toast.success('Informe guardado');
        setReportName('');
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const isMoney = metric === 'sum';
  const fmt = (v: number) => isMoney ? v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : v.toLocaleString('es-ES');

  return (
    <div className="space-y-6">
      {/* Builder */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Entidad</Label>
              <Select value={entity} onValueChange={onEntityChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Medir</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METRICS[entity].map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agrupado por</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS[entity].map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Periodo</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gráfico</Label>
              <Select value={chart} onValueChange={(v) => setChart(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHARTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => run()} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Ejecutar
            </Button>
            {rows && (
              <div className="flex gap-2 flex-1 max-w-md">
                <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Nombre para guardar este informe" />
                <Button variant="outline" onClick={save} disabled={pending}><Save className="h-4 w-4" /> Guardar</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {rows && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {METRICS[entity].find((m) => m.value === metric)?.label} por {GROUPS[entity].find((g) => g.value === groupBy)?.label}
            </CardTitle>
            <div className="text-sm font-bold">{fmt(total)} <span className="text-xs text-muted-foreground font-normal">total</span></div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin datos en este periodo</p>
            ) : chart === 'table' ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2">{GROUPS[entity].find((g) => g.value === groupBy)?.label}</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">%</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b last:border-0">
                      <td className="py-2">{r.label}</td>
                      <td className="py-2 text-right font-medium">{fmt(r.value)}</td>
                      <td className="py-2 text-right text-muted-foreground">{total > 0 ? ((r.value / total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chart === 'bar' ? (
                    <BarChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  ) : chart === 'line' ? (
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <PieChart>
                      <Pie data={rows} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="75%" paddingAngle={2} label={(e: any) => e.label}>
                        {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guardados */}
      {saved.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Informes guardados</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {saved.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3">
                  <button onClick={() => run(s.config)} className="flex-1 text-left text-sm hover:underline">
                    {s.name}
                  </button>
                  <span className="text-xs text-muted-foreground">{s.by}</span>
                  <button
                    onClick={() => { if (confirm('¿Eliminar informe?')) startTransition(async () => { await deleteReport(s.id); router.refresh(); }); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
