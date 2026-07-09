'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * Motor de informes con whitelisting estricto: entidades, métricas y
 * agrupaciones cerradas. Nada de SQL dinámico del cliente.
 */

const configSchema = z.object({
  entity: z.enum(['sales', 'commissions', 'leads', 'deals', 'tasks', 'tickets']),
  metric: z.enum(['count', 'sum']),
  groupBy: z.string().min(1).max(40),
  period: z.enum(['30d', '90d', 'year', 'all']),
  chart: z.enum(['bar', 'line', 'pie', 'table']),
});

export type ReportConfig = z.infer<typeof configSchema>;
export type ReportRow = { label: string; value: number };

// Agrupaciones válidas por entidad → cómo resolver la etiqueta
const GROUPS: Record<string, Record<string, string>> = {
  sales:       { brand: 'Marca', representative: 'Representante', status: 'Estado', month: 'Mes' },
  commissions: { representative: 'Representante', status: 'Estado', month: 'Mes' },
  leads:       { source: 'Origen', status: 'Estado', month: 'Mes' },
  deals:       { stage: 'Etapa', owner: 'Propietario', status: 'Estado', month: 'Mes' },
  tasks:       { assignee: 'Asignado', status: 'Estado', priority: 'Prioridad', month: 'Mes' },
  tickets:     { status: 'Estado', priority: 'Prioridad', assignee: 'Asignado', month: 'Mes' },
};

// Campo a sumar cuando metric=sum (fijo por entidad, no elegible → seguro)
const SUM_FIELDS: Record<string, string | null> = {
  sales: 'total',
  commissions: 'amount',
  deals: 'amount',
  leads: 'estimatedValue',
  tasks: null,
  tickets: null,
};

function periodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '30d':  return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    case '90d':  return new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    default:     return null;
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function runReport(input: ReportConfig): Promise<{ rows: ReportRow[]; total: number }> {
  const session = await requireAuth();
  const cfg = configSchema.parse(input);
  const orgId = session.user.organizationId;

  if (!GROUPS[cfg.entity]?.[cfg.groupBy]) throw new Error('Agrupación no válida para esta entidad');
  if (cfg.metric === 'sum' && !SUM_FIELDS[cfg.entity]) throw new Error('Esta entidad no soporta suma');

  const since = periodStart(cfg.period);
  const dateFilter = since ? { createdAt: { gte: since } } : {};

  // Carga los registros con los includes mínimos para etiquetar
  let records: { label: string; amount: number; createdAt: Date }[] = [];

  switch (cfg.entity) {
    case 'sales': {
      const rows = await prisma.sale.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { total: true, status: true, createdAt: true, brand: { select: { name: true } }, representative: { select: { name: true } } },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'brand' ? r.brand.name
             : cfg.groupBy === 'representative' ? r.representative.name
             : cfg.groupBy === 'status' ? r.status
             : monthKey(r.createdAt),
        amount: Number(r.total),
        createdAt: r.createdAt,
      }));
      break;
    }
    case 'commissions': {
      const rows = await prisma.commission.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { amount: true, status: true, createdAt: true, representative: { select: { name: true } } },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'representative' ? r.representative.name
             : cfg.groupBy === 'status' ? r.status
             : monthKey(r.createdAt),
        amount: Number(r.amount),
        createdAt: r.createdAt,
      }));
      break;
    }
    case 'leads': {
      const rows = await prisma.lead.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { estimatedValue: true, status: true, source: true, createdAt: true },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'source' ? (r.source ?? 'Sin origen')
             : cfg.groupBy === 'status' ? r.status
             : monthKey(r.createdAt),
        amount: Number(r.estimatedValue ?? 0),
        createdAt: r.createdAt,
      }));
      break;
    }
    case 'deals': {
      const rows = await prisma.deal.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { amount: true, status: true, createdAt: true, stage: { select: { name: true } }, owner: { select: { name: true } } },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'stage' ? (r.stage?.name ?? 'Sin etapa')
             : cfg.groupBy === 'owner' ? (r.owner?.name ?? 'Sin propietario')
             : cfg.groupBy === 'status' ? r.status
             : monthKey(r.createdAt),
        amount: Number(r.amount),
        createdAt: r.createdAt,
      }));
      break;
    }
    case 'tasks': {
      const rows = await prisma.task.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { status: true, priority: true, createdAt: true, assignee: { select: { name: true } } },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'assignee' ? (r.assignee?.name ?? 'Sin asignar')
             : cfg.groupBy === 'status' ? r.status
             : cfg.groupBy === 'priority' ? r.priority
             : monthKey(r.createdAt),
        amount: 0,
        createdAt: r.createdAt,
      }));
      break;
    }
    case 'tickets': {
      const rows = await prisma.ticket.findMany({
        where: { organizationId: orgId, ...dateFilter },
        select: { status: true, priority: true, createdAt: true, agent: { select: { name: true } } },
      });
      records = rows.map((r) => ({
        label: cfg.groupBy === 'assignee' ? (r.agent?.name ?? 'Sin asignar')
             : cfg.groupBy === 'status' ? r.status
             : cfg.groupBy === 'priority' ? r.priority
             : monthKey(r.createdAt),
        amount: 0,
        createdAt: r.createdAt,
      }));
      break;
    }
  }

  // Agregación
  const acc = new Map<string, number>();
  for (const r of records) {
    const val = cfg.metric === 'count' ? 1 : r.amount;
    acc.set(r.label, (acc.get(r.label) ?? 0) + val);
  }

  let rows = [...acc.entries()].map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
  // Meses en orden cronológico; el resto por valor desc
  if (cfg.groupBy === 'month') rows.sort((a, b) => a.label.localeCompare(b.label));
  else rows.sort((a, b) => b.value - a.value);

  const total = rows.reduce((s, r) => s + r.value, 0);
  return { rows: rows.slice(0, 20), total: Math.round(total * 100) / 100 };
}

// ===== Guardado de informes =====

export async function saveReport(name: string, config: ReportConfig) {
  const session = await requireAuth();
  const cfg = configSchema.parse(config);
  if (!name.trim()) throw new Error('Ponle un nombre');
  await prisma.savedReport.create({
    data: {
      name: name.trim().slice(0, 80),
      config: cfg,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
    },
  });
  revalidatePath('/report-builder');
  return { ok: true };
}

export async function deleteReport(id: string) {
  const session = await requireAuth();
  await prisma.savedReport.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath('/report-builder');
  return { ok: true };
}
