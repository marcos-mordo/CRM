'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const SHORTCUTS: { group: string; items: { keys: string[]; desc: string }[] }[] = [
  {
    group: 'Navegación',
    items: [
      { keys: ['G', 'D'], desc: 'Ir a Dashboard' },
      { keys: ['G', 'V'], desc: 'Ir a Ventas' },
      { keys: ['G', 'C'], desc: 'Ir a Clientes' },
      { keys: ['G', 'L'], desc: 'Ir a Leads' },
      { keys: ['G', 'P'], desc: 'Ir a Pipeline' },
      { keys: ['G', 'T'], desc: 'Ir a Tareas' },
      { keys: ['G', 'M'], desc: 'Ir a Mi dashboard' },
    ],
  },
  {
    group: 'Acciones',
    items: [
      { keys: ['Ctrl', 'N'], desc: 'Crear nuevo (menú rápido)' },
      { keys: ['Ctrl', 'K'], desc: 'Búsqueda global' },
      { keys: ['Ctrl', '/'], desc: 'AI chat' },
      { keys: ['Ctrl', '.'], desc: 'Modo presentación' },
      { keys: ['Esc'], desc: 'Cerrar modal/menú' },
    ],
  },
  {
    group: 'Tablas',
    items: [
      { keys: ['↑', '↓'], desc: 'Navegar filas' },
      { keys: ['Enter'], desc: 'Abrir/editar' },
      { keys: ['Space'], desc: 'Seleccionar fila' },
      { keys: ['Del'], desc: 'Eliminar seleccionado' },
    ],
  },
  {
    group: 'Ayuda',
    items: [
      { keys: ['?'], desc: 'Mostrar esta lista' },
    ],
  },
];

export function ShortcutsCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ? sin modificadores y no en input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atajos de teclado
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.group}</h3>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li key={it.desc} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{it.desc}</span>
                    <span className="flex gap-1">
                      {it.keys.map((k, idx) => (
                        <kbd key={idx} className="px-1.5 py-0.5 text-[11px] rounded border bg-muted font-mono">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-3 border-t">
          Pulsa <kbd className="px-1.5 py-0.5 text-[11px] rounded border bg-muted font-mono">?</kbd> en cualquier momento para ver esta lista.
        </p>
      </DialogContent>
    </Dialog>
  );
}
