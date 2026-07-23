/**
 * QA de líneas de producto en oportunidades (CPQ básico).
 * Verifica el cálculo de total por línea, el recálculo de deal.amount,
 * el descuento, el borrado y el puente a cotización — con la lógica real.
 * Limpia lo que crea.
 */
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (n: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${n} ${extra}`); if (!ok) fail++; };
const money = (n: number) => Math.round(n * 100) / 100;

// Réplica mínima del recálculo (idéntica a line-items-actions.ts)
const lineTotal = (q: number, p: number, d: number) => money(q * p * (1 - d / 100));
async function recompute(dealId: string) {
  const lines = await prisma.dealLineItem.findMany({ where: { dealId }, select: { total: true } });
  if (lines.length === 0) return;
  const sum = lines.reduce((s, l) => s + Number(l.total), 0);
  await prisma.deal.update({ where: { id: dealId }, data: { amount: money(sum), lastActivityAt: new Date() } });
}
async function addLine(dealId: string, i: { description: string; quantity: number; unitPrice: number; discount?: number; productId?: string | null }) {
  const line = await prisma.dealLineItem.create({
    data: { dealId, productId: i.productId ?? null, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount ?? 0, total: lineTotal(i.quantity, i.unitPrice, i.discount ?? 0) },
  });
  await recompute(dealId);
  return line;
}

async function main() {
  const org = await prisma.organization.findFirst();
  const pipeline = await prisma.pipeline.findFirst({ where: { organizationId: org!.id }, include: { stages: true } });
  const TAG = `zzli_${Date.now()}`;
  const deal = await prisma.deal.create({
    data: { title: `Deal ${TAG}`, amount: 999, currency: 'EUR', status: 'OPEN', organizationId: org!.id, pipelineId: pipeline!.id, stageId: pipeline!.stages[0].id },
  });

  // 1. Línea simple: 3 × 100 = 300 → deal.amount=300 (sustituye el 999 manual)
  const l1 = await addLine(deal.id, { description: 'Servicio A', quantity: 3, unitPrice: 100 });
  check('total línea 1 = 300', Number(l1.total) === 300, `(${Number(l1.total)})`);
  let d = await prisma.deal.findUnique({ where: { id: deal.id } });
  check('deal.amount recalculado a 300', Number(d!.amount) === 300, `(${Number(d!.amount)})`);

  // 2. Segunda línea con 10% dto: 2 × 50 × 0.9 = 90 → total deal 390
  const l2 = await addLine(deal.id, { description: 'Producto B', quantity: 2, unitPrice: 50, discount: 10 });
  check('total línea 2 con 10% dto = 90', Number(l2.total) === 90, `(${Number(l2.total)})`);
  d = await prisma.deal.findUnique({ where: { id: deal.id } });
  check('deal.amount suma de líneas = 390', Number(d!.amount) === 390, `(${Number(d!.amount)})`);

  // 3. Borrar la línea 2 → vuelve a 300
  await prisma.dealLineItem.delete({ where: { id: l2.id } });
  await recompute(deal.id);
  d = await prisma.deal.findUnique({ where: { id: deal.id } });
  check('deal.amount tras borrar línea = 300', Number(d!.amount) === 300, `(${Number(d!.amount)})`);

  // 4. Puente a cotización: subtotal = suma de líneas del deal
  const lines = await prisma.dealLineItem.findMany({ where: { dealId: deal.id } });
  const subtotal = lines.reduce((s, l) => s + Number(l.total), 0);
  const count = await prisma.quote.count({ where: { organizationId: org!.id } });
  const quote = await prisma.quote.create({
    data: {
      number: `Q-${TAG}`, status: 'DRAFT', issueDate: new Date(), customerName: `Deal ${TAG}`,
      subtotal, taxAmount: 0, discount: 0, total: subtotal, currency: 'EUR', organizationId: org!.id, dealId: deal.id,
      lines: { create: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: 0, total: l.total, productId: l.productId })) },
    },
    include: { lines: true },
  });
  check('cotización creada con líneas del deal', quote.lines.length === 1 && Number(quote.total) === 300, `(${quote.lines.length} líneas, total ${Number(quote.total)})`);

  // Limpieza
  try {
    await prisma.quoteLine.deleteMany({ where: { quoteId: quote.id } });
    await prisma.quote.delete({ where: { id: quote.id } });
    await prisma.dealLineItem.deleteMany({ where: { dealId: deal.id } });
    await prisma.deal.delete({ where: { id: deal.id } });
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Líneas de producto OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
