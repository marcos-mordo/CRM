'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserPlus,
  Kanban,
  CheckSquare,
  Package,
  FileText,
  Receipt,
  Mail,
  List,
  Headphones,
  BookOpen,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type NavSection = {
  label: string;
  items: { href: string; icon: any; labelKey: string }[];
};

export function Sidebar() {
  const pathname = usePathname();
  const tNav = useTranslations('Nav');

  const sections: NavSection[] = [
    {
      label: 'CRM',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
        { href: '/contacts', icon: Users, labelKey: 'contacts' },
        { href: '/companies', icon: Building2, labelKey: 'companies' },
        { href: '/leads', icon: UserPlus, labelKey: 'leads' },
        { href: '/pipeline', icon: Kanban, labelKey: 'pipeline' },
        { href: '/tasks', icon: CheckSquare, labelKey: 'tasks' },
      ],
    },
    {
      label: tNav('sales'),
      items: [
        { href: '/products', icon: Package, labelKey: 'products' },
        { href: '/quotes', icon: FileText, labelKey: 'quotes' },
        { href: '/invoices', icon: Receipt, labelKey: 'invoices' },
      ],
    },
    {
      label: tNav('marketing'),
      items: [
        { href: '/campaigns', icon: Mail, labelKey: 'campaigns' },
        { href: '/lists', icon: List, labelKey: 'lists' },
      ],
    },
    {
      label: tNav('support'),
      items: [
        { href: '/tickets', icon: Headphones, labelKey: 'tickets' },
        { href: '/knowledge', icon: BookOpen, labelKey: 'knowledge' },
      ],
    },
    {
      label: tNav('settings'),
      items: [{ href: '/settings', icon: Settings, labelKey: 'settings' }],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden lg:flex w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg">CRM Pro</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{tNav(item.labelKey as any)}</span>
                      {isActive && <ChevronRight className="h-3 w-3" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
