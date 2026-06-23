'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/notifications/actions';
import type { Notification } from '@prisma/client';

const TYPE_DOT: Record<string, string> = {
  SALE_CREATED: 'bg-cyan-500',
  SALE_SIGNED: 'bg-emerald-500',
  COMMISSION_PENDING: 'bg-amber-500',
  COMMISSION_PAID: 'bg-green-500',
  COMMISSION_APPROVED: 'bg-blue-500',
  TASK_ASSIGNED: 'bg-purple-500',
  MENTION: 'bg-indigo-500',
  SYSTEM: 'bg-slate-500',
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [, startTransition] = useTransition();

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load();

    // Server-Sent Events: empuja cambios sin polling cliente
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      try {
        es = new EventSource('/api/notifications/stream');
      } catch {
        return;
      }

      es.addEventListener('unread', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setUnread(data.count ?? 0);
        } catch {}
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setItems((prev) => [data, ...prev].slice(0, 20));
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        // Reintenta tras 5s
        reconnectTimer = window.setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      es?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, []);

  const openOne = (n: Notification) => {
    if (!n.read) {
      startTransition(async () => {
        await markNotificationRead(n.id);
        await load();
      });
    }
    if (n.link) {
      router.push(n.link);
      setOpen(false);
    }
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      await load();
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unread > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Notificaciones</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
              <Check className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin notificaciones</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openOne(n)}
                    className={cn(
                      'w-full text-left flex gap-3 p-3 hover:bg-accent text-sm transition border-b last:border-0',
                      !n.read && 'bg-accent/30'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', TYPE_DOT[n.type] ?? 'bg-slate-500')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium truncate', !n.read && 'font-semibold')}>{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
