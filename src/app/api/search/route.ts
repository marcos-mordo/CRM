import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const orgId = session.user.organizationId;
  const limit = 5;
  const insensitive = { mode: 'insensitive' as const };

  const [contacts, customers, brands, products, sales] = await Promise.all([
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: q, ...insensitive } },
          { lastName: { contains: q, ...insensitive } },
          { email: { contains: q, ...insensitive } },
        ],
      },
      take: limit,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.endCustomer.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: q, ...insensitive } },
          { lastName: { contains: q, ...insensitive } },
          { companyName: { contains: q, ...insensitive } },
          { taxId: { contains: q, ...insensitive } },
          { email: { contains: q, ...insensitive } },
        ],
      },
      take: limit,
      select: { id: true, firstName: true, lastName: true, companyName: true, isCompany: true, taxId: true },
    }),
    prisma.brand.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: q, ...insensitive } },
          { legalName: { contains: q, ...insensitive } },
        ],
      },
      take: limit,
      select: { id: true, name: true },
    }),
    prisma.brandProduct.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: q, ...insensitive } },
          { sku: { contains: q, ...insensitive } },
        ],
      },
      take: limit,
      select: { id: true, name: true, sku: true, brand: { select: { name: true } } },
    }),
    prisma.sale.findMany({
      where: {
        organizationId: orgId,
        number: { contains: q, ...insensitive },
      },
      take: limit,
      select: { id: true, number: true, brand: { select: { name: true } }, total: true, currency: true },
    }),
  ]);

  const results = [
    ...contacts.map((c) => ({
      type: 'contact' as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? '',
      href: `/contacts`,
    })),
    ...customers.map((c) => ({
      type: 'customer' as const,
      id: c.id,
      title: c.isCompany ? c.companyName ?? '' : `${c.firstName} ${c.lastName}`,
      subtitle: c.taxId ?? '',
      href: `/end-customers`,
    })),
    ...brands.map((b) => ({
      type: 'brand' as const,
      id: b.id,
      title: b.name,
      subtitle: 'Marca representada',
      href: `/brands`,
    })),
    ...products.map((p) => ({
      type: 'product' as const,
      id: p.id,
      title: p.name,
      subtitle: `${p.brand.name} · SKU ${p.sku}`,
      href: `/catalog?brand=${p.id}`,
    })),
    ...sales.map((s) => ({
      type: 'sale' as const,
      id: s.id,
      title: s.number,
      subtitle: `${s.brand.name} · ${Number(s.total)} ${s.currency}`,
      href: `/sales-orders/${s.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
