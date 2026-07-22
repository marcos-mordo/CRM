import ExcelJS from 'exceljs';

export type CellType = 'text' | 'number' | 'currency' | 'date' | 'datetime';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  type?: CellType;
  width?: number;
  get?: (row: T) => any; // valor derivado; si no, se usa row[key]
}

export interface Sheet<T> {
  name: string;
  columns: Column<T>[];
  rows: T[];
}

/**
 * Genera un .xlsx real (OOXML) con cabecera estilizada, tipos de celda
 * correctos (números como números, fechas como fechas, moneda con formato) y
 * auto-filtro. Devuelve un Buffer listo para descargar.
 */
export async function buildWorkbook<T extends Record<string, any>>(sheets: Sheet<T>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BrandHub CRM';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sanitizeSheetName(sheet.name), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = sheet.columns.map((c) => ({
      header: c.label,
      key: String(c.key),
      width: c.width ?? Math.max(12, Math.min(48, c.label.length + 4)),
    }));

    // Cabecera con estilo (fondo índigo, texto blanco, negrita)
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    header.alignment = { vertical: 'middle', horizontal: 'left' };
    header.height = 20;

    for (const row of sheet.rows) {
      const values: Record<string, any> = {};
      for (const col of sheet.columns) {
        const raw = col.get ? col.get(row) : row[col.key as keyof T];
        values[String(col.key)] = coerce(raw, col.type);
      }
      const added = ws.addRow(values);
      // Formato por columna
      sheet.columns.forEach((col, i) => {
        const cell = added.getCell(i + 1);
        if (col.type === 'currency') cell.numFmt = '#,##0.00';
        else if (col.type === 'number') cell.numFmt = '#,##0.##';
        else if (col.type === 'date') cell.numFmt = 'yyyy-mm-dd';
        else if (col.type === 'datetime') cell.numFmt = 'yyyy-mm-dd hh:mm';
      });
    }

    // Auto-filtro sobre toda la tabla
    if (sheet.columns.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function coerce(value: any, type?: CellType): any {
  if (value === null || value === undefined) return '';
  if (type === 'date' || type === 'datetime') {
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? '' : d;
  }
  if (type === 'number' || type === 'currency') {
    const n = typeof value === 'number' ? value : Number(value);
    return isNaN(n) ? '' : n;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

// Excel prohíbe : \ / ? * [ ] y limita a 31 chars
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Hoja1';
}

export function xlsxHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    'Cache-Control': 'no-store',
  };
}
