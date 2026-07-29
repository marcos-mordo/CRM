export type FilterType = 'text' | 'select' | 'number' | 'date';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[]; // para type 'select'
}

export interface FilterCondition {
  field: string;
  op: string;
  value: string;
}

// Operadores disponibles por tipo (value = clave interna, label = texto)
export const OPERATORS: Record<FilterType, { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'contiene' },
    { value: 'equals', label: 'es igual a' },
    { value: 'notContains', label: 'no contiene' },
    { value: 'empty', label: 'está vacío' },
  ],
  select: [
    { value: 'is', label: 'es' },
    { value: 'isNot', label: 'no es' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
  ],
  date: [
    { value: 'after', label: 'después de' },
    { value: 'before', label: 'antes de' },
    { value: 'on', label: 'el día' },
  ],
};

/** Evalúa una condición contra un valor bruto de fila. */
export function matchCondition(raw: any, op: string, value: string, type: FilterType): boolean {
  const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';

  if (type === 'text') {
    const s = String(raw ?? '').toLowerCase();
    const q = value.toLowerCase();
    switch (op) {
      case 'contains': return s.includes(q);
      case 'notContains': return !s.includes(q);
      case 'equals': return s === q;
      case 'empty': return isEmpty;
      default: return true;
    }
  }
  if (type === 'select') {
    const s = String(raw ?? '');
    if (op === 'is') return s === value;
    if (op === 'isNot') return s !== value;
    return true;
  }
  if (type === 'number') {
    if (isEmpty) return false;
    const n = Number(raw);
    const v = Number(value);
    if (isNaN(n) || isNaN(v)) return false;
    switch (op) {
      case 'eq': return n === v;
      case 'gt': return n > v;
      case 'lt': return n < v;
      case 'gte': return n >= v;
      case 'lte': return n <= v;
      default: return true;
    }
  }
  if (type === 'date') {
    if (isEmpty) return false;
    const d = new Date(raw).getTime();
    const v = new Date(value).getTime();
    if (isNaN(d) || isNaN(v)) return false;
    // 'on' compara por día (ignora la hora)
    if (op === 'on') {
      const a = new Date(raw); const b = new Date(value);
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    if (op === 'after') return d > v;
    if (op === 'before') return d < v;
    return true;
  }
  return true;
}

/**
 * Aplica TODAS las condiciones (AND) a las filas. `accessors` mapea cada
 * field.key → función que extrae el valor bruto de la fila.
 * `types` mapea field.key → su tipo.
 */
export function applyFilters<T>(
  rows: T[],
  conditions: FilterCondition[],
  accessors: Record<string, (row: T) => any>,
  types: Record<string, FilterType>,
): T[] {
  const active = conditions.filter((c) => c.op === 'empty' || String(c.value).trim() !== '');
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every((c) => {
      const get = accessors[c.field];
      const type = types[c.field];
      if (!get || !type) return true;
      return matchCondition(get(row), c.op, c.value, type);
    })
  );
}
