'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { addComment } from '@/app/(dashboard)/tickets/actions';

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [internal, setInternal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    startTransition(async () => {
      try {
        await addComment(ticketId, content, internal);
        setContent('');
        setInternal(false);
        toast.success(t('Common.saved'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t pt-4">
      <Textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe tu respuesta..."
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          {t('Tickets.internalNote')}
        </label>
        <Button type="submit" disabled={isPending || !content.trim()}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('Tickets.addComment')}
        </Button>
      </div>
    </form>
  );
}
