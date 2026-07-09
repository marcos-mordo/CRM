import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { DuplicateGroups } from '@/components/contacts/duplicate-groups';
import { CheckCircle2 } from 'lucide-react';

export default async function DuplicatesPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, mobile: true,
      createdAt: true, company: { select: { name: true } },
      _count: { select: { deals: true, tasks: true } },
    },
  });

  // Agrupar por email exacto y por teléfono normalizado
  const groups: Map<string, typeof contacts> = new Map();
  const byEmail = new Map<string, typeof contacts>();
  const byPhone = new Map<string, typeof contacts>();

  for (const c of contacts) {
    if (c.email) {
      const k = `e:${c.email.toLowerCase()}`;
      byEmail.set(k, [...(byEmail.get(k) ?? []), c]);
    }
    const phones = [c.phone, c.mobile].filter(Boolean).map((p) => p!.replace(/\D/g, '')).filter((p) => p.length >= 7);
    for (const p of phones) {
      const k = `p:${p}`;
      byPhone.set(k, [...(byPhone.get(k) ?? []), c]);
    }
  }
  for (const [k, list] of [...byEmail, ...byPhone]) {
    // dedupe contactos dentro del grupo
    const unique = [...new Map(list.map((c) => [c.id, c])).values()];
    if (unique.length > 1) groups.set(k, unique);
  }

  // Evitar grupos redundantes (mismo conjunto de ids)
  const seen = new Set<string>();
  const finalGroups: { key: string; contacts: typeof contacts }[] = [];
  for (const [k, list] of groups) {
    const sig = list.map((c) => c.id).sort().join(',');
    if (seen.has(sig)) continue;
    seen.add(sig);
    finalGroups.push({ key: k, contacts: list });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contactos duplicados"
        description="Detectados por email o teléfono idénticos. Elige cuál conservar y fusiona: no se pierde nada (deals, tareas, notas y adjuntos se mueven al que conservas)."
      />
      {finalGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="font-medium">Sin duplicados 🎉</p>
            <p className="text-sm text-muted-foreground">Tu base de contactos está limpia.</p>
          </CardContent>
        </Card>
      ) : (
        <DuplicateGroups
          groups={finalGroups.map((g) => ({
            key: g.key,
            reason: g.key.startsWith('e:') ? `email: ${g.key.slice(2)}` : `teléfono: ${g.key.slice(2)}`,
            contacts: g.contacts.map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`,
              email: c.email,
              phone: c.phone ?? c.mobile,
              company: c.company?.name ?? null,
              deals: c._count.deals,
              tasks: c._count.tasks,
              createdAt: c.createdAt.toISOString(),
            })),
          }))}
        />
      )}
    </div>
  );
}
