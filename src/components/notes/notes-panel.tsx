'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, StickyNote, Trash2 } from 'lucide-react';
import { createNote, deleteNote } from '@/app/(dashboard)/notes/actions';
import { formatDateTime, initials } from '@/lib/utils';

interface NoteItem {
  id: string;
  content: string;
  createdAt: Date | string;
  author: { id: string; name: string };
}

interface Props {
  notes: NoteItem[];
  contactId?: string;
  currentUserId: string;
  canDelete?: boolean;
}

export function NotesPanel({ notes, contactId, currentUserId, canDelete = false }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    startTransition(async () => {
      try {
        await createNote({ content: text, contactIds: contactId ? [contactId] : [] });
        toast.success('Nota añadida');
        router.refresh();
      } catch (err: any) {
        setDraft(text);
        toast.error(err.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    startTransition(async () => {
      try {
        await deleteNote(id);
        toast.success('Nota eliminada');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notas ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            placeholder="Escribe una nota..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !draft.trim()}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Añadir nota
            </Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin notas aún.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="border-l-2 border-primary/30 pl-3 group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px]">{initials(n.author.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{n.author.name}</span>
                    <span className="text-xs text-muted-foreground">· {formatDateTime(n.createdAt)}</span>
                  </div>
                  {(canDelete || n.author.id === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => remove(n.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
