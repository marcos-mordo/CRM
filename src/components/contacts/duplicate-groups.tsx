'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Merge, Crown, Loader2 } from 'lucide-react';
import { mergeContacts } from '@/app/(dashboard)/contacts/duplicates/actions';
import { formatDate } from '@/lib/utils';

type Dup = {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; deals: number; tasks: number; createdAt: string;
};

export function DuplicateGroups({ groups }: { groups: { key: string; reason: string; contacts: Dup[] }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // keeper por grupo (default: el más antiguo = primero creado)
  const [keepers, setKeepers] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => {
      const oldest = [...g.contacts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      return [g.key, oldest.id];
    }))
  );

  const merge = (group: { key: string; contacts: Dup[] }) => {
    const keepId = keepers[group.key];
    const mergeIds = group.contacts.filter((c) => c.id !== keepId).map((c) => c.id);
    if (!confirm(`¿Fusionar ${mergeIds.length + 1} contactos en uno? Los datos se conservan.`)) return;
    startTransition(async () => {
      try {
        const r = await mergeContacts(keepId, mergeIds);
        toast.success(`${r.merged + 1} contactos fusionados en 1`);
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.key}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {g.contacts.length} contactos con el mismo <Badge variant="secondary">{g.reason}</Badge>
            </CardTitle>
            <Button size="sm" onClick={() => merge(g)} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
              Fusionar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {g.contacts.map((c) => {
                const isKeeper = keepers[g.key] === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      isKeeper ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`keep-${g.key}`}
                      checked={isKeeper}
                      onChange={() => setKeepers({ ...keepers, [g.key]: c.id })}
                      className="accent-current"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm flex items-center gap-2">
                        {c.name}
                        {isKeeper && <Badge className="text-[10px]"><Crown className="h-3 w-3 mr-1" /> Se conserva</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[c.email, c.phone, c.company].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>{c.deals} deals · {c.tasks} tareas</p>
                      <p>desde {formatDate(c.createdAt)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
