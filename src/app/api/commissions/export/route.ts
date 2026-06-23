import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { toCsv } from '@/lib/csv';

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const repId = searchParams.get('rep') ?? undefined;

  const commissions = await prisma.commission.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(status ? { status: status as any } : {}),
      ...(repId ? { representativeId: repId } : {}),
    },
    include: {
      sale: { include: { brand: true, endCustomer: true } },
      representative: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = commissions.map((c) => ({
    saleNumber: c.sale.number,
    brand: c.sale.brand.name,
    customer: c.sale.endCustomer.isCompany
      ? c.sale.endCustomer.companyName ?? ''
      : `${c.sale.endCustomer.firstName ?? ''} ${c.sale.endCustomer.lastName ?? ''}`.trim(),
    representative: c.representative.name,
    representativeEmail: c.representative.email,
    amount: Number(c.amount),
    currency: c.currency,
    status: c.status,
    createdAt: c.createdAt.toISOString().slice(0, 10),
    paidAt: c.paidAt?.toISOString().slice(0, 10) ?? '',
    paidMethod: c.paidMethod ?? '',
    paidReference: c.paidReference ?? '',
  }));

  const csv = toCsv(rows, [
    { key: 'saleNumber', label: 'Venta' },
    { key: 'brand', label: 'Marca' },
    { key: 'customer', label: 'Cliente' },
    { key: 'representative', label: 'Representante' },
    { key: 'representativeEmail', label: 'Email rep.' },
    { key: 'amount', label: 'Comisión' },
    { key: 'currency', label: 'Moneda' },
    { key: 'status', label: 'Estado' },
    { key: 'createdAt', label: 'Generada' },
    { key: 'paidAt', label: 'Pagada' },
    { key: 'paidMethod', label: 'Método' },
    { key: 'paidReference', label: 'Referencia' },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="comisiones-${today}.csv"`,
    },
  });
}
