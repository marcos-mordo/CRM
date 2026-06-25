'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Handshake, UserCheck, Trophy, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/sales-orders', icon: Handshake, label: 'Ventas' },
  { href: '/end-customers', icon: UserCheck, label: 'Clientes' },
  { href: '/me', icon: Trophy, label: 'Yo' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-area-bottom">
      <div className="grid grid-cols-5 h-14">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-xs transition',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/more"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 text-xs transition',
            (pathname === '/more' || pathname.startsWith('/more/')) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Más</span>
        </Link>
      </div>
    </nav>
  );
}
