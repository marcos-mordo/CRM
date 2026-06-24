'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Mail, MoreVertical, Trash2 } from 'lucide-react';
import { EmailTemplateDialog } from './template-dialog';
import { deleteEmailTemplate } from '@/app/(dashboard)/email-templates/actions';
import { formatDate } from '@/lib/utils';
import type { EmailTemplate } from '@prisma/client';

export function EmailTemplatesList({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [, startTransition] = useTransition();

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    startTransition(async () => {
      await deleteEmailTemplate(id);
      toast.success('Plantilla eliminada');
      router.refresh();
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <Card key={tpl.id} className={!tpl.active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{tpl.name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(tpl)}><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(tpl.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {tpl.category && <Badge variant="secondary" className="text-xs">{tpl.category}</Badge>}
                {!tpl.active && <Badge variant="destructive" className="text-xs">Inactiva</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Actualizada {formatDate(tpl.updatedAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && <EmailTemplateDialog template={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
