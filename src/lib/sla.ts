import type { TicketPriority } from '@prisma/client';

export type SlaState = 'ok' | 'at_risk' | 'breached' | 'met' | 'none';

export type SlaEvaluation = {
  firstResponse: SlaState;
  resolution: SlaState;
  /** minutos restantes (negativo = vencido) del hito más urgente pendiente */
  minutesLeft: number | null;
};

type PolicyMap = Partial<Record<TicketPriority, { firstResponseMins: number; resolutionMins: number }>>;

const AT_RISK_THRESHOLD = 0.25; // último 25% del plazo = "en riesgo"

/**
 * Evalúa el estado SLA de un ticket contra la política de su prioridad.
 * Sin política para esa prioridad → 'none'.
 */
export function evaluateSla(
  ticket: {
    priority: TicketPriority;
    createdAt: Date;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    status: string;
  },
  policies: PolicyMap,
  now: Date = new Date()
): SlaEvaluation {
  const policy = policies[ticket.priority];
  if (!policy) return { firstResponse: 'none', resolution: 'none', minutesLeft: null };

  const elapsedMins = (d: Date) => (d.getTime() - ticket.createdAt.getTime()) / 60000;

  // Primera respuesta
  let firstResponse: SlaState;
  if (ticket.firstResponseAt) {
    firstResponse = elapsedMins(ticket.firstResponseAt) <= policy.firstResponseMins ? 'met' : 'breached';
  } else {
    const used = elapsedMins(now);
    if (used > policy.firstResponseMins) firstResponse = 'breached';
    else if (used > policy.firstResponseMins * (1 - AT_RISK_THRESHOLD)) firstResponse = 'at_risk';
    else firstResponse = 'ok';
  }

  // Resolución
  let resolution: SlaState;
  const closed = ticket.resolvedAt ?? (['RESOLVED', 'CLOSED'].includes(ticket.status) ? now : null);
  if (closed) {
    resolution = elapsedMins(closed) <= policy.resolutionMins ? 'met' : 'breached';
  } else {
    const used = elapsedMins(now);
    if (used > policy.resolutionMins) resolution = 'breached';
    else if (used > policy.resolutionMins * (1 - AT_RISK_THRESHOLD)) resolution = 'at_risk';
    else resolution = 'ok';
  }

  // Minutos restantes del hito pendiente más urgente
  let minutesLeft: number | null = null;
  if (!ticket.firstResponseAt) {
    minutesLeft = Math.round(policy.firstResponseMins - elapsedMins(now));
  } else if (!closed) {
    minutesLeft = Math.round(policy.resolutionMins - elapsedMins(now));
  }

  return { firstResponse, resolution, minutesLeft };
}

export const DEFAULT_POLICIES: { priority: TicketPriority; firstResponseMins: number; resolutionMins: number }[] = [
  { priority: 'URGENT', firstResponseMins: 60,      resolutionMins: 4 * 60 },
  { priority: 'HIGH',   firstResponseMins: 4 * 60,  resolutionMins: 24 * 60 },
  { priority: 'MEDIUM', firstResponseMins: 8 * 60,  resolutionMins: 48 * 60 },
  { priority: 'LOW',    firstResponseMins: 24 * 60, resolutionMins: 7 * 24 * 60 },
];
