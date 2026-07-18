import { prisma } from './prisma';

/**
 * Deal rotting: estado de "frescura" de un deal abierto según días sin
 * actividad. Feature estrella de Pipedrive.
 */
export type RotState = 'fresh' | 'warm' | 'rotting';

export function rotStateFor(lastActivityAt: Date, rottingDays: number, now: Date = new Date()): { state: RotState; daysIdle: number } {
  const daysIdle = Math.floor((now.getTime() - lastActivityAt.getTime()) / 86400000);
  if (daysIdle >= rottingDays) return { state: 'rotting', daysIdle };
  if (daysIdle >= Math.ceil(rottingDays / 2)) return { state: 'warm', daysIdle };
  return { state: 'fresh', daysIdle };
}

/** Marca un deal como "tocado" (resetea el reloj de rotting). */
export async function touchDeal(dealId: string): Promise<void> {
  await prisma.deal.update({ where: { id: dealId }, data: { lastActivityAt: new Date() } }).catch(() => null);
}

/**
 * Round-robin: elige el siguiente rep de forma rotativa y avanza el puntero.
 * Devuelve el userId o null si no hay reps o está desactivado.
 */
export async function pickRoundRobinOwner(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { roundRobinEnabled: true, roundRobinPointer: true },
  });
  if (!org?.roundRobinEnabled) return null;

  // Reps elegibles: activos con rol que vende (AGENT, MANAGER, ADMIN, OWNER)
  const reps = await prisma.user.findMany({
    where: { organizationId, active: true, role: { in: ['AGENT', 'MANAGER', 'ADMIN', 'OWNER'] } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (reps.length === 0) return null;

  const idx = org.roundRobinPointer % reps.length;
  const chosen = reps[idx].id;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { roundRobinPointer: (org.roundRobinPointer + 1) % reps.length },
  });
  return chosen;
}

/** Analítica win/loss de deals cerrados en un periodo. */
export async function winLossAnalytics(organizationId: string, sinceDays = 90) {
  const since = new Date(Date.now() - sinceDays * 86400000);
  const closed = await prisma.deal.findMany({
    where: { organizationId, status: { in: ['WON', 'LOST'] }, closedAt: { gte: since } },
    select: { status: true, amount: true, createdAt: true, closedAt: true, lostReason: true },
  });

  const won = closed.filter((d) => d.status === 'WON');
  const lost = closed.filter((d) => d.status === 'LOST');
  const winRate = closed.length > 0 ? (won.length / closed.length) * 100 : 0;

  const wonValue = won.reduce((s, d) => s + Number(d.amount), 0);
  const lostValue = lost.reduce((s, d) => s + Number(d.amount), 0);

  // Ciclo de venta medio (días de creación a cierre) de los ganados
  const cycles = won
    .filter((d) => d.closedAt)
    .map((d) => (d.closedAt!.getTime() - d.createdAt.getTime()) / 86400000);
  const avgCycle = cycles.length > 0 ? cycles.reduce((a, b) => a + b, 0) / cycles.length : 0;

  // Razones de pérdida
  const reasons = new Map<string, number>();
  for (const d of lost) {
    const r = d.lostReason?.trim() || 'Sin razón';
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }

  return {
    total: closed.length,
    won: won.length,
    lost: lost.length,
    winRate: Math.round(winRate * 10) / 10,
    wonValue: Math.round(wonValue),
    lostValue: Math.round(lostValue),
    avgCycleDays: Math.round(avgCycle),
    lossReasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}
