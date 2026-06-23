'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Building2, Handshake, Loader2, Package, Search, Store, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ResultType = 'contact' | 'customer' | 'brand' | 'product' | 'sale';

type Result = {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const ICONS: Record<ResultType, any> = {
  contact: Users,
  customer: UserCheck,
  brand: Store,
  product: Package,
  sale: Handshake,
};

const LABELS: Record<ResultType, string> = {
  contact: 'Contacto',
  customer: 'Cliente',
  brand: 'Marca',
  product: 'Producto',
  sale: 'Venta',
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
          if (!res.ok) return;
          const data = await res.json();
          setResults(data.results ?? []);
          setActive(0);
        } catch {
          // ignore
        }
      });
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const go = (r: Result) => {
    router.push(r.href);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground hidden sm:flex gap-2 pr-1"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
      </Button>

      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Buscar contactos, clientes, marcas, productos, ventas..."
              className="border-0 shadow-none focus-visible:ring-0 h-12"
            />
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {query.length < 2 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Escribe al menos 2 caracteres para buscar.
              </p>
            ) : results.length === 0 && !isPending ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sin resultados.</p>
            ) : (
              <ul className="p-1">
                {results.map((r, idx) => {
                  const Icon = ICONS[r.type];
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                          idx === active ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => go(r)}
                        onMouseEnter={() => setActive(idx)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.title}</p>
                          {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">{LABELS[r.type]}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navegar</span>
            <span><kbd className="bg-muted px-1 rounded">↵</kbd> abrir</span>
            <span><kbd className="bg-muted px-1 rounded">Esc</kbd> cerrar</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
