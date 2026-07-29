'use client';

import { useEffect, useState } from 'react';

interface SavedView { cols: string[]; extra?: any }

/**
 * Preferencias de columnas de una tabla, persistidas por usuario en
 * localStorage (por dispositivo, sin migración de BD, funciona offline).
 * Devuelve el array ORDENADO de claves visibles y un setter.
 *
 * `allKeys` es el orden canónico por defecto (todas visibles).
 * `viewExtras` (opcional) permite que una "vista guardada" recuerde también
 * estado adicional de la tabla (p.ej. filtros y orden): capture() lo lee al
 * guardar y restore() lo aplica al cargar la vista.
 */
export function useColumnPrefs(
  storageKey: string,
  allKeys: string[],
  defaultVisible?: string[],
  viewExtras?: { capture: () => any; restore: (extra: any) => void },
): {
  visible: string[];
  hydrated: boolean;
  toggle: (key: string) => void;
  move: (key: string, dir: -1 | 1) => void;
  reset: () => void;
  views: Record<string, SavedView>;
  saveView: (name: string) => void;
  applyView: (name: string) => void;
  deleteView: (name: string) => void;
} {
  const initial = defaultVisible ?? allKeys;
  const [visible, setVisible] = useState<string[]>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [views, setViews] = useState<Record<string, SavedView>>({});
  const viewsKey = `${storageKey}.views`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: string[] = JSON.parse(raw);
        const clean = saved.filter((k) => allKeys.includes(k));
        if (clean.length > 0) setVisible(clean);
      }
      const rawViews = localStorage.getItem(viewsKey);
      if (rawViews) {
        const parsed = JSON.parse(rawViews);
        // Compat: formato antiguo = Record<string, string[]>
        const norm: Record<string, SavedView> = {};
        for (const [name, val] of Object.entries(parsed)) {
          norm[name] = Array.isArray(val) ? { cols: val } : (val as SavedView);
        }
        setViews(norm);
      }
    } catch { /* localStorage no disponible */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persistViews = (next: Record<string, SavedView>) => {
    setViews(next);
    try { localStorage.setItem(viewsKey, JSON.stringify(next)); } catch { /* noop */ }
  };

  const persist = (next: string[]) => {
    setVisible(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ }
  };

  const toggle = (key: string) => {
    if (visible.includes(key)) {
      if (visible.length === 1) return; // deja siempre al menos una columna
      persist(visible.filter((k) => k !== key));
    } else {
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

  // Vistas con nombre: columnas + estado extra (filtros/orden) opcional
  const saveView = (name: string) => {
    const n = name.trim();
    if (!n) return;
    persistViews({ ...views, [n]: { cols: visible, extra: viewExtras?.capture() } });
  };
  const applyView = (name: string) => {
    const v = views[name];
    if (!v) return;
    persist(v.cols.filter((k) => allKeys.includes(k)));
    if (viewExtras && v.extra !== undefined) viewExtras.restore(v.extra);
  };
  const deleteView = (name: string) => {
    const next = { ...views };
    delete next[name];
    persistViews(next);
  };

  return { visible, hydrated, toggle, move, reset, views, saveView, applyView, deleteView };
}
