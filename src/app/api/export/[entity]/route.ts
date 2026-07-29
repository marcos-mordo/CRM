import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { EXPORTS, customFieldColumns } from '@/lib/export-registry';
import { buildWorkbook, xlsxHeaders, type Column } from '@/lib/xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const format = (new URL(req.url).searchParams.get('format') ?? 'xlsx').toLowerCase();
  return buildExport(entity, format, null);
}

// POST con { ids?: string[], format?: string } — exporta solo esos registros
// (p.ej. lo que el usuario tiene filtrado en pantalla).
export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  let body: { ids?: string[]; format?: string } = {};
  try { body = await req.json(); } catch { /* body vacío */ }
  const format = (new URL(req.url).searchParams.get('format') ?? body.format ?? 'xlsx').toLowerCase();
  const ids = Array.isArray(body.ids) ? new Set(body.ids) : null;
  return buildExport(entity, format, ids);
}

async function buildExport(entity: string, format: string, ids: Set<string> | null) {
  const session = await requireAuth();
  const def = EXPORTS[entity];
  if (!def) return NextResponse.json({ error: 'unknown_entity' }, { status: 404 });

  const [allRows, cfCols] = await Promise.all([
    def.fetch(session.user.organizationId),
    customFieldColumns(session.user.organizationId, entity),
  ]);
  const rows = ids ? allRows.filter((r: any) => ids.has(r.id)) : allRows;
  const columns = [...def.columns, ...cfCols]; // campos personalizados al final
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${entity}-${today}`;

  if (format === 'csv') {
    const csv = toCsv(rows, columns);
    return new NextResponse('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const buffer = await buildWorkbook([{ name: def.label, columns, rows }]);
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxHeaders(filename) });
}

function toCsv(rows: any[], columns: Column<any>[]): string {
  const header = columns.map((c) => cell(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
      const raw = c.get ? c.get(row) : row[c.key as string];
      return cell(format(raw, c.type));
    }).join(',')
  );
  return [header, ...lines].join('\r\n');
}

function format(value: any, type?: string): any {
  if (value === null || value === undefined) return '';
  if (type === 'date') return new Date(value).toISOString().slice(0, 10);
  if (type === 'datetime') return new Date(value).toISOString().slice(0, 16).replace('T', ' ');
  if (type === 'number' || type === 'currency') return Number(value);
  return value;
}

function cell(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
