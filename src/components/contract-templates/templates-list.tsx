'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { TemplateDialog } from './template-dialog';
import { deleteContractTemplate } from '@/app/(dashboard)/contract-templates/actions';
import { formatDate } from '@/lib/utils';
import type { Brand, ContractTemplate } from '@prisma/client';

type Row = ContractTemplate & { brand: Brand | null };

export function TemplatesList({ templates, brands }: { templates: Row[]; brands: Brand[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [, startTransition] = useTransition();

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteContractTemplate(id);
      toast.success(t('Common.deleted'));
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
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{tpl.name}</CardTitle>
                    <CardDescription className="text-xs">v{tpl.version} · {formatDate(tpl.updatedAt)}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(tpl)}>
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(tpl.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {tpl.brand ? (
                  <Badge variant="secondary">{tpl.brand.name}</Badge>
                ) : (
                  <Badge variant="outline">Global</Badge>
                )}
                {!tpl.active && <Badge variant="destructive">Inactiva</Badge>}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-3 font-mono">
                {tpl.htmlContent.slice(0, 200)}...
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <TemplateDialog
          template={editing}
          brands={brands}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
