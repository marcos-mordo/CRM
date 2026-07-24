'use client';

import { useEffect, useState } from 'react';

/**
 * Preferencias de columnas de una tabla, persistidas por usuario en
 * localStorage (por dispositivo, sin migración de BD, funciona offline).
 * Devuelve el array ORDENADO de claves visibles y un setter.
 *
 * `allKeys` es el orden canónico por defecto (todas visibles).
 */
export function useColumnPrefs(storageKey: string, allKeys: string[], defaultVisible?: string[]): {
  visible: string[];
  hydrated: boolean;
  toggle: (key: string) => void;
  move: (key: string, dir: -1 | 1) => void;
  reset: () => void;
} {
  // Columnas mostradas de inicio (por defecto todas). Sirve para tener
  // columnas disponibles en el menú pero ocultas hasta que el usuario las active
  // (p.ej. campos personalizados).
  const initial = defaultVisible ?? allKeys;
  const [visible, setVisible] = useState<string[]>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: string[] = JSON.parse(raw);
        // Solo claves que aún existen; conserva el orden guardado.
        const clean = saved.filter((k) => allKeys.includes(k));
        if (clean.length > 0) setVisible(clean);
      }
    } catch { /* localStorage no disponible */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (next: string[]) => {
    setVisible(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ }
  };

  const toggle = (key: string) => {
    if (visible.includes(key)) {
      if (visible.length === 1) return; // deja siempre al menos una columna
      persist(visible.filter((k) => k !== key));
    } else {
      // Reinserta respetando el orden canónico
      const next = allKeys.filter((k) => visible.includes(k) || k === key);
      persist(next);
    }
  };

  const move = (key: string, dir: -1 | 1) => {
    const i = visible.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= visible.length) return;
    const next = [...visible];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  const reset = () => persist(initial);

  return { visible, hydrated, toggle, move, reset };
}
