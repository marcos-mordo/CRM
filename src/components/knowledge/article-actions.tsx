'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { ArticleDialog } from './article-dialog';
import { deleteArticle } from '@/app/(dashboard)/knowledge/actions';
import type { Article } from '@prisma/client';

export function ArticleActions({ article }: { article: Article }) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const remove = () => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteArticle(article.id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4" /> {t('Common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={remove} className="text-destructive">
            <Trash2 className="h-4 w-4" /> {t('Common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editing && <ArticleDialog article={article} open={editing} onOpenChange={setEditing} />}
    </>
  );
}
