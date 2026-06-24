'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SHORTCUTS = [
  { combo: 'G D', label: 'Ir al Dashboard', path: '/dashboard' },
  { combo: 'G M', label: 'Mi panel', path: '/me' },
  { combo: 'G C', label: 'Contactos', path: '/contacts' },
  { combo: 'G L', label: 'Leads', path: '/leads' },
  { combo: 'G P', label: 'Pipeline', path: '/pipeline' },
  { combo: 'G T', label: 'Tareas', path: '/tasks' },
  { combo: 'G B', label: 'Marcas', path: '/brands' },
  { combo: 'G V', label: 'Ventas', path: '/sales-orders' },
  { combo: 'G W', label: 'Comisiones', path: '/commissions' },
  { combo: 'G K', label: 'Calendario', path: '/calendar' },
  { combo: 'G H', label: 'Chat equipo', path: '/chat' },
  { combo: 'G R', label: 'Reportes', path: '/reports' },
  { combo: 'G S', label: 'Settings', path: '/settings' },
];

const SPECIAL = [
  { combo: 'Ctrl/Cmd+K', label: 'Búsqueda global' },
  { combo: '?', label: 'Mostrar esta ayuda' },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const lastKey = useRef<string | null>(null);
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // ? para mostrar ayuda (incluso fuera de inputs)
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (isTyping) return;

      // Atajos tipo "G + X" (vim-style)
      const now = Date.now();
      if (e.key === 'g' || e.key === 'G') {
        lastKey.current = 'g';
        lastKeyTime.current = now;
        return;
      }

      if (lastKey.current === 'g' && now - lastKeyTime.current < 1500) {
        const match = SHORTCUTS.find((s) => s.combo === `G ${e.key.toUpperCase()}`);
        if (match) {
          e.preventDefault();
          router.push(match.path);
        }
        lastKey.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wider">Navegación</p>
            <ul className="text-sm space-y-1">
              {SHORTCUTS.map((s) => (
                <li key={s.combo} className="flex items-center justify-between py-1">
                  <span>{s.label}</span>
                  <kbd className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{s.combo}</kbd>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wider">Acciones</p>
            <ul className="text-sm space-y-1">
              {SPECIAL.map((s) => (
                <li key={s.combo} className="flex items-center justify-between py-1">
                  <span>{s.label}</span>
                  <kbd className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{s.combo}</kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
