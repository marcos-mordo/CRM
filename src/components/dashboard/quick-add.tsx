'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Building2, UserPlus, CheckSquare, Handshake, FileText, Phone, Calendar as CalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { href: '/contacts?new=1',        icon: Users,        label: 'Contacto',    shortcut: 'C' },
  { href: '/companies?new=1',       icon: Building2,    label: 'Empresa',     shortcut: 'E' },
  { href: '/leads?new=1',           icon: UserPlus,     label: 'Lead',        shortcut: 'L' },
  { href: '/tasks?new=1',           icon: CheckSquare,  label: 'Tarea',       shortcut: 'T' },
  { href: '/sales-orders/new',      icon: Handshake,    label: 'Venta',       shortcut: 'V' },
  { href: '/quotes?new=1',          icon: FileText,     label: 'Cotización',  shortcut: 'Q' },
  { href: '/activities?new=call',   icon: Phone,        label: 'Llamada',     shortcut: 'P' },
  { href: '/calendar?new=1',        icon: CalIcon,      label: 'Evento',      shortcut: 'A' },
];

export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N abre el menú
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      // Atajos rápidos cuando está abierto
      if (open && !e.metaKey && !e.ctrlKey) {
        const a = ACTIONS.find((x) => x.shortcut.toLowerCase() === e.key.toLowerCase());
        if (a) {
          e.preventDefault();
          setOpen(false);
          router.push(a.href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, router]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('[data-quickadd]')) setOpen(false);
    };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  return (
    <div data-quickadd className="fixed bottom-24 right-6 z-40 lg:bottom-6">
      {open && (
        <div className="absolute bottom-16 right-0 w-60 bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground bg-muted/30">
            Crear nuevo · ⌘N
          </div>
          <ul className="py-1">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.href}>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); router.push(a.href); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{a.label}</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                      {a.shortcut}
                    </kbd>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl',
          'flex items-center justify-center hover:scale-105 transition',
          open && 'rotate-45'
        )}
        title="Crear nuevo (Ctrl/Cmd+N)"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
