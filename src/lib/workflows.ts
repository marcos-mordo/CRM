import { prisma } from './prisma';
import { sendMail } from './mailer';
import { notifyManagers } from './notifications';

export const WORKFLOW_TRIGGERS = [
  { value: 'SALE_CREATED',        label: 'Venta creada' },
  { value: 'SALE_SIGNED',         label: 'Venta firmada' },
  { value: 'SALE_CANCELLED',      label: 'Venta cancelada' },
  { value: 'COMMISSION_APPROVED', label: 'Comisión aprobada' },
  { value: 'COMMISSION_PAID',     label: 'Comisión pagada' },
  { value: 'CUSTOMER_CREATED',    label: 'Cliente creado' },
  { value: 'LEAD_CREATED',        label: 'Lead creado' },
] as const;

type Condition = { field: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains'; value: string };
type Action =
  | { type: 'create_task'; params: { title: string; priority?: string } }
  | { type: 'notify_managers'; params: { title: string; message?: string } }
  | { type: 'send_email'; params: { to: string; subject: string; body: string } }
  | { type: 'http_webhook'; params: { url: string } };

/**
 * Sustituye {{campo}} por el valor del payload. Soporta paths con punto:
 * {{customer.name}}. Valores no encontrados quedan como "—".
 */
function template(str: string, payload: Record<string, any>): string {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const val = path.split('.').reduce((acc: any, k: string) => acc?.[k], payload);
    return val === undefined || val === null ? '—' : String(val);
  });
}

function getField(payload: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc: any, k: string) => acc?.[k], payload);
}

function checkConditions(conditions: Condition[] | null | undefined, payload: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => {
    const raw = getField(payload, c.field);
    const val = c.value;
    switch (c.op) {
      case 'eq':       return String(raw ?? '').toLowerCase() === val.toLowerCase();
      case 'neq':      return String(raw ?? '').toLowerCase() !== val.toLowerCase();
      case 'gt':       return Number(raw) > Number(val);
      case 'lt':       return Number(raw) < Number(val);
      case 'contains': return String(raw ?? '').toLowerCase().includes(val.toLowerCase());
      default:         return false;
    }
  });
}

async function executeAction(
  action: Action,
  payload: Record<string, any>,
  organizationId: string
): Promise<string> {
  switch (action.type) {
    case 'create_task': {
      const admin = await prisma.user.findFirst({
        where: { organizationId, role: { in: ['OWNER', 'ADMIN'] } },
        select: { id: true },
      });
      if (!admin) throw new Error('sin admin para asignar la tarea');
      await prisma.task.create({
        data: {
          title: template(action.params.title, payload),
          priority: (action.params.priority as any) ?? 'MEDIUM',
          status: 'PENDING',
          creatorId: admin.id,
          assigneeId: (payload.representativeId as string) ?? admin.id,
          organizationId,
          dueDate: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
      return 'tarea creada';
    }
    case 'notify_managers': {
      await notifyManagers({
        organizationId,
        type: 'SYSTEM' as any,
        title: template(action.params.title, payload),
        message: action.params.message ? template(action.params.message, payload) : undefined,
      });
      return 'managers notificados';
    }
    case 'send_email': {
      await sendMail({
        to: action.params.to,
        subject: template(action.params.subject, payload),
        html: `<p>${template(action.params.body, payload).replace(/\n/g, '<br/>')}</p>`,
      });
      return `email a ${action.params.to}`;
    }
    case 'http_webhook': {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(action.params.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'BrandHub-Workflows/1.0' },
        body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
        signal: controller.signal,
      });
      clearTimeout(t);
      return `webhook HTTP ${res.status}`;
    }
    default:
      throw new Error(`acción desconocida`);
  }
}

/**
 * Punto de entrada del motor. Fire-and-forget: nunca lanza, nunca bloquea.
 * Llamar desde cualquier sitio donde ocurra un evento de negocio.
 */
export function triggerWorkflows(input: {
  organizationId: string;
  trigger: string;
  payload: Record<string, any>;
}): void {
  runWorkflows(input).catch((err) => {
    console.error('[workflows] error:', err?.message);
  });
}

async function runWorkflows(input: {
  organizationId: string;
  trigger: string;
  payload: Record<string, any>;
}): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { organizationId: input.organizationId, trigger: input.trigger, active: true },
  });
  if (workflows.length === 0) return;

  for (const wf of workflows) {
    const conditions = wf.conditions as Condition[] | null;
    if (!checkConditions(conditions, input.payload)) {
      await prisma.workflowRun.create({
        data: {
          workflowId: wf.id,
          trigger: input.trigger,
          payload: input.payload as any,
          status: 'SKIPPED',
          detail: 'condiciones no cumplidas',
          organizationId: input.organizationId,
        },
      }).catch(() => null);
      continue;
    }

    const results: string[] = [];
    let failed = false;
    for (const action of wf.actions as Action[]) {
      try {
        const r = await executeAction(action, input.payload, input.organizationId);
        results.push(`[OK] ${action.type}: ${r}`);
      } catch (err: any) {
        failed = true;
        results.push(`[ERR] ${action.type}: ${err.message}`);
      }
    }

    await Promise.all([
      prisma.workflowRun.create({
        data: {
          workflowId: wf.id,
          trigger: input.trigger,
          payload: input.payload as any,
          status: failed ? 'FAILED' : 'SUCCESS',
          detail: results.join('\n'),
          organizationId: input.organizationId,
        },
      }).catch(() => null),
      prisma.workflow.update({
        where: { id: wf.id },
        data: { runsCount: { increment: 1 }, lastRunAt: new Date() },
      }).catch(() => null),
    ]);
  }
}
