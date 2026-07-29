'use client';

import { useState } from 'react';
import type { SortDir } from '@/lib/sort-rows';

/** Estado de ordenación de una tabla: clave activa + dirección. Al clicar una
 *  cabecera se cicla asc → desc → sin orden. */
export function useTableSort(): { sortKey: string | null; sortDir: SortDir; toggle: (key: string) => void } {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggle = (key: string) => {
    if (key !== sortKey) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('asc');
  };

  return { sortKey, sortDir, toggle };
}
