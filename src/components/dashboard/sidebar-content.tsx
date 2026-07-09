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
  Store,
  PackageSearch,
  Handshake,
  Wallet,
  UserCheck,
  ShieldCheck,
  Trophy,
  CalendarDays,
  FileBarChart,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand-logo';
import { useSession } from 'next-auth/react';

type NavSection = {
  label: string;
  items: { href: string; icon: any; labelKey: string }[];
};

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const tNav = useTranslations('Nav');
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  const sections: NavSection[] = [
    {
      label: 'CRM',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
        { href: '/me', icon: Trophy, labelKey: 'myDashboard' },
        { href: '/goals', icon: Trophy, labelKey: 'goals' },
        { href: '/contacts', icon: Users, labelKey: 'contacts' },
        { href: '/companies', icon: Building2, labelKey: 'companies' },
        { href: '/leads', icon: UserPlus, labelKey: 'leads' },
        { href: '/pipeline', icon: Kanban, labelKey: 'pipeline' },
        { href: '/tasks', icon: CheckSquare, labelKey: 'tasks' },
        { href: '/calendar', icon: CalendarDays, labelKey: 'calendar' },
        { href: '/bookings', icon: CalendarDays, labelKey: 'bookings' },
        { href: '/chat', icon: MessageCircle, labelKey: 'chat' },
        { href: '/web-forms', icon: FileText, labelKey: 'webForms' },
        { href: '/workflows', icon: Zap, labelKey: 'workflows' },
      ],
    },
    {
      label: tNav('brandhub'),
      items: [
        { href: '/brands', icon: Store, labelKey: 'brands' },
        { href: '/catalog', icon: PackageSearch, labelKey: 'brandProducts' },
        { href: '/end-customers', icon: UserCheck, labelKey: 'endCustomers' },
        { href: '/sales-orders', icon: Handshake, labelKey: 'sales' },
        { href: '/commissions', icon: Wallet, labelKey: 'commissions' },
        { href: '/contract-templates', icon: FileText, labelKey: 'contractTemplates' },
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
        { href: '/email-templates', icon: FileText, labelKey: 'emailTemplates' },
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
      items: [
        { href: '/settings', icon: Settings, labelKey: 'settings' },
        ...(isAdmin ? [{ href: '/reports', icon: FileBarChart, labelKey: 'reports' as const }] : []),
        ...(isAdmin ? [{ href: '/audit-log', icon: ShieldCheck, labelKey: 'auditLog' as const }] : []),
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 font-semibold">
          <BrandLogo size={32} />
          <span className="text-lg">BrandHub</span>
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
                      onClick={onNavigate}
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
    </div>
  );
}
