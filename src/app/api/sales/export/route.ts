import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { toCsv } from '@/lib/csv';

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const sales = await prisma.sale.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(status ? { status: status as any } : {}),
      ...(fromParam || toParam
        ? {
            saleDate: {
              ...(fromParam ? { gte: new Date(fromParam) } : {}),
              ...(toParam ? { lte: new Date(toParam) } : {}),
            },
          }
        : {}),
    },
    include: {
      brand: true,
      endCustomer: true,
      representative: true,
    },
    orderBy: { saleDate: 'desc' },
  });

  const rows = sales.map((s) => ({
    number: s.number,
    status: s.status,
    saleDate: s.saleDate.toISOString().slice(0, 10),
    signedAt: s.signedAt?.toISOString().slice(0, 10) ?? '',
    activatedAt: s.activatedAt?.toISOString().slice(0, 10) ?? '',
    brand: s.brand.name,
    customer: s.endCustomer.isCompany
      ? s.endCustomer.companyName ?? ''
      : `${s.endCustomer.firstName ?? ''} ${s.endCustomer.lastName ?? ''}`.trim(),
    customerTaxId: s.endCustomer.taxId ?? '',
    customerEmail: s.endCustomer.email ?? '',
    representative: s.representative.name,
    subtotal: Number(s.subtotal),
    taxAmount: Number(s.taxAmount),
    total: Number(s.total),
    totalCommission: Number(s.totalCommission),
    currency: s.currency,
  }));

  const csv = toCsv(rows, [
    { key: 'number', label: 'Número' },
    { key: 'status', label: 'Estado' },
    { key: 'saleDate', label: 'Fecha venta' },
    { key: 'signedAt', label: 'Firmada' },
    { key: 'activatedAt', label: 'Activada' },
    { key: 'brand', label: 'Marca' },
    { key: 'customer', label: 'Cliente' },
    { key: 'customerTaxId', label: 'DNI/CIF' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'representative', label: 'Representante' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxAmount', label: 'IVA' },
    { key: 'total', label: 'Total' },
    { key: 'totalCommission', label: 'Comisión' },
    { key: 'currency', label: 'Moneda' },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventas-${today}.csv"`,
    },
  });
}
