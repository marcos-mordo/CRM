'use server';

import { requireAuth } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import { parseTable, autoMap } from '@/lib/parse-table';
import { IMPORTS } from '@/lib/import-registry';

const MAX_ROWS = 5000;

export async function previewImport(entity: string, formData: FormData) {
  await requireAuth();
  const def = IMPORTS[entity];
  if (!def) throw new Error('Entidad no válida');
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No se recibió ningún fichero');

  const buffer = Buffer.from(await file.arrayBuffer());
  const { headers, rows } = await parseTable(file.name, buffer);
  if (headers.length === 0) throw new Error('El fichero está vacío o no se pudo leer');

  const limited = rows.slice(0, MAX_ROWS);
  return {
    headers,
    rows: limited,
    total: rows.length,
    truncated: rows.length > MAX_ROWS,
    mapping: autoMap(headers, def.fields),
  };
}

export async function runImport(
  entity: string,
  mapping: Record<string, string>,
  headers: string[],
  rows: string[][]
) {
  const session = await requireAuth();
  const def = IMPORTS[entity];
  if (!def) throw new Error('Entidad no válida');

  // Valida que los campos requeridos estén mapeados
  const missing = def.fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);
  if (missing.length > 0) throw new Error(`Faltan campos obligatorios por mapear: ${missing.join(', ')}`);

  const headerIndex = new Map(headers.map((h, i) => [h, i]));
  const mapped = rows.slice(0, MAX_ROWS).map((row) => {
    const rec: Record<string, string> = {};
    for (const [fieldKey, header] of Object.entries(mapping)) {
      if (!header) continue;
      const idx = headerIndex.get(header);
      rec[fieldKey] = idx !== undefined ? (row[idx] ?? '') : '';
    }
    return rec;
  });

  const result = await def.run(session.user.organizationId, mapped);
  revalidatePath(`/${entity}`);
  return result;
}
