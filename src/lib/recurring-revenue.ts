import { prisma } from '@/lib/prisma';

// Frecuencias que generan ingreso recurrente y su factor a MRR (mensual).
const MONTHLY_FACTOR: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
};

export type RecurringMetrics = Awaited<ReturnType<typeof recurringRevenue>>;

function customerName(ec: { isCompany: boolean; companyName: string | null; firstName: string | null; lastName: string | null } | null): string {
  if (!ec) return 'Cliente';
  if (ec.isCompany) return ec.companyName ?? 'Empresa';
  return [ec.firstName, ec.lastName].filter(Boolean).join(' ') || 'Cliente';
}

/**
 * Ingresos recurrentes (MRR/ARR) de la agencia a partir de las ventas ACTIVAS
 * y FIRMADAS cuyos productos tienen facturación periódica. Cada línea se
 * normaliza a su aportación mensual (anual/12, trimestral/3, mensual x1).
 */
export async function recurringRevenue(organizationId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [live, cancelled] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId, status: { in: ['ACTIVE', 'SIGNED'] } },
      select: {
        id: true, number: true, currency: true, signedAt: true, saleDate: true,
        brand: { select: { name: true } },
        endCustomer: { select: { isCompany: true, companyName: true, firstName: true, lastName: true } },
        representative: { select: { name: true } },
        lines: {
          select: {
            quantity: true, unitPrice: true, description: true,
            product: { select: { name: true, billingFrequency: true } },
          },
        },
      },
    }),
    prisma.sale.findMany({
      where: { organizationId, status: 'CANCELLED', cancelledAt: { gte: monthStart } },
      select: { lines: { select: { quantity: true, unitPrice: true, product: { select: { billingFrequency: true } } } } },
    }),
  ]);

  let mrr = 0;
  let newMrr = 0;
  const byBrand = new Map<string, { mrr: number; count: number }>();
  const byFreq = new Map<string, { mrr: number; count: number }>();
  const customers = new Set<string>();
  const contracts: { customer: string; brand: string; product: string; frequency: string; mrr: number; rep: string }[] = [];

  for (const sale of live) {
    const signed = sale.signedAt ?? sale.saleDate;
    const isNewThisMonth = signed >= monthStart;
    for (const line of sale.lines) {
      const freq = line.product?.billingFrequency;
      if (!freq || !(freq in MONTHLY_FACTOR)) continue; // ONE_TIME u otros → no recurrente
      const periodAmount = Number(line.unitPrice) * Number(line.quantity);
      const lineMrr = periodAmount * MONTHLY_FACTOR[freq];
      if (lineMrr <= 0) continue;

      mrr += lineMrr;
      if (isNewThisMonth) newMrr += lineMrr;
      customers.add(sale.id + ':' + (sale.endCustomer?.companyName ?? sale.endCustomer?.firstName ?? sale.id));

      const brand = sale.brand?.name ?? 'Sin marca';
      const b = byBrand.get(brand) ?? { mrr: 0, count: 0 };
      b.mrr += lineMrr; b.count += 1; byBrand.set(brand, b);

      const f = byFreq.get(freq) ?? { mrr: 0, count: 0 };
      f.mrr += lineMrr; f.count += 1; byFreq.set(freq, f);

      contracts.push({
        customer: customerName(sale.endCustomer),
        brand,
        product: line.product?.name ?? line.description,
        frequency: freq,
        mrr: lineMrr,
        rep: sale.representative?.name ?? '—',
      });
    }
  }

  let churnedMrr = 0;
  for (const sale of cancelled) {
    for (const line of sale.lines) {
      const freq = line.product?.billingFrequency;
      if (!freq || !(freq in MONTHLY_FACTOR)) continue;
      churnedMrr += Number(line.unitPrice) * Number(line.quantity) * MONTHLY_FACTOR[freq];
    }
  }

  const activeContracts = contracts.length;
  const arpa = customers.size > 0 ? mrr / customers.size : 0;

  return {
    mrr,
    arr: mrr * 12,
    activeContracts,
    customers: customers.size,
    arpa,
    newMrr,
    churnedMrr,
    netMrr: newMrr - churnedMrr,
    byBrand: Array.from(byBrand, ([name, v]) => ({ name, ...v })).sort((a, b) => b.mrr - a.mrr),
    byFrequency: (['MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((f) => ({ freq: f, ...(byFreq.get(f) ?? { mrr: 0, count: 0 }) })),
    topContracts: contracts.sort((a, b) => b.mrr - a.mrr).slice(0, 8),
  };
}
