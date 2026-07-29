export type SortDir = 'asc' | 'desc' | null;

const isEmpty = (v: any) => v === null || v === undefined || v === '';

/** Compara dos valores NO vacíos: números como números, texto con orden natural. */
function compareNonNull(a: any, b: any): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Ordena una copia de las filas por el valor que devuelve `accessor`. Estable.
 *  Los valores vacíos quedan siempre al final, en ambas direcciones. */
export function sortRows<T>(rows: T[], accessor: ((row: T) => any) | undefined, dir: SortDir): T[] {
  if (!dir || !accessor) return rows;
  const copy = [...rows];
  copy.sort((x, y) => {
    const a = accessor(x);
    const b = accessor(y);
    const an = isEmpty(a);
    const bn = isEmpty(b);
    if (an && bn) return 0;
    if (an) return 1;  // vacío siempre después
    if (bn) return -1;
    const c = compareNonNull(a, b);
    return dir === 'asc' ? c : -c;
  });
  return copy;
}
