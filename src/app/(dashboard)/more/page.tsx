import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Building2, Kanban, CheckSquare, Store, PackageSearch, Wallet, FileText,
  CalendarDays, MessageCircle, Package, Receipt, Mail, List, Headphones,
  BookOpen, Settings, ShieldCheck, FileBarChart, UserPlus,
} from 'lucide-react';

export default async function MorePage() {
  const session = await requireAuth();
  const admin = isAdmin(session.user.role);

  const groups = [
    {
      label: 'CRM',
      items: [
        { href: '/companies', icon: Building2, label: 'Empresas' },
        { href: '/leads', icon: UserPlus, label: 'Leads' },
        { href: '/pipeline', icon: Kanban, label: 'Pipeline' },
        { href: '/tasks', icon: CheckSquare, label: 'Tareas' },
        { href: '/calendar', icon: CalendarDays, label: 'Calendario' },
        { href: '/chat', icon: MessageCircle, label: 'Chat equipo' },
        { href: '/end-customers/map', icon: Building2, label: 'Mapa clientes' },
      ],
    },
    {
      label: 'BrandHub',
      items: [
        { href: '/brands', icon: Store, label: 'Marcas' },
        { href: '/catalog', icon: PackageSearch, label: 'Catálogo' },
        { href: '/commissions', icon: Wallet, label: 'Comisiones' },
        { href: '/contract-templates', icon: FileText, label: 'Plantillas contrato' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { href: '/products', icon: Package, label: 'Productos' },
        { href: '/quotes', icon: FileText, label: 'Cotizaciones' },
        { href: '/invoices', icon: Receipt, label: 'Facturas' },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { href: '/campaigns', icon: Mail, label: 'Campañas' },
        { href: '/lists', icon: List, label: 'Listas' },
        { href: '/email-templates', icon: FileText, label: 'Plantillas email' },
      ],
    },
    {
      label: 'Soporte',
      items: [
        { href: '/tickets', icon: Headphones, label: 'Tickets' },
        { href: '/knowledge', icon: BookOpen, label: 'Base conocimiento' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { href: '/settings', icon: Settings, label: 'Configuración' },
        ...(admin ? [{ href: '/reports', icon: FileBarChart, label: 'Reportes' }] : []),
        ...(admin ? [{ href: '/audit-log', icon: ShieldCheck, label: 'Auditoría' }] : []),
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title="Más opciones" description="Todas las secciones del CRM" />

      {groups.map((g) => (
        <div key={g.label}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{g.label}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="hover:bg-accent transition cursor-pointer">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">{item.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
