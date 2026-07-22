import ExcelJS from 'exceljs';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/** Parsea un CSV respetando comillas, comas y saltos de línea escapados. */
export function parseCsv(text: string): ParsedTable {
  // Quita BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',' || c === ';') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      records.push(row); row = [];
    } else if (c === '\r') {
      // ignora; el \n siguiente cierra la fila
    } else field += c;
  }
  // último campo/fila
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row); }
  const nonEmpty = records.filter((r) => r.some((v) => v.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

/** Parsea un .xlsx (primera hoja) con exceljs. */
export async function parseXlsx(buffer: Buffer): Promise<ParsedTable> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };
  const matrix: string[][] = [];
  ws.eachRow((r) => {
    const vals: string[] = [];
    // getCell es 1-based; recorremos hasta columnCount
    for (let c = 1; c <= ws.columnCount; c++) {
      vals.push(cellText(r.getCell(c).value));
    }
    matrix.push(vals);
  });
  const nonEmpty = matrix.filter((r) => r.some((v) => v.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

function cellText(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text); // rich text / hyperlink
    if ('result' in value) return String(value.result); // fórmula
    if ('richText' in value) return value.richText.map((t: any) => t.text).join('');
    return '';
  }
  return String(value);
}

export async function parseTable(filename: string, buffer: Buffer): Promise<ParsedTable> {
  if (/\.xlsx?$/i.test(filename)) return parseXlsx(buffer);
  return parseCsv(buffer.toString('utf-8'));
}

/**
 * Sugiere un mapeo automático emparejando cabeceras del fichero con los campos
 * destino por similitud de nombre (normalizado sin acentos/espacios).
 */
export function autoMap(fileHeaders: string[], targetFields: { key: string; label: string; aliases?: string[] }[]): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const map: Record<string, string> = {};
  for (const field of targetFields) {
    const candidates = [field.key, field.label, ...(field.aliases ?? [])].map(norm);
    const hit = fileHeaders.find((h) => candidates.includes(norm(h)));
    if (hit) map[field.key] = hit;
  }
  return map;
}
