'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { initials, formatDateTime, cn } from '@/lib/utils';
import { createConversation, markConversationRead, sendMessage } from '@/app/(dashboard)/chat/actions';

type UserLite = { id: string; name: string; email: string; avatar?: string | null };

interface Conv {
  id: string;
  title: string | null;
  updatedAt: Date;
  participants: { userId: string; lastReadAt: Date | null; user: UserLite }[];
  messages: { content: string; createdAt: Date; authorId: string }[];
}

interface Msg {
  id: string;
  content: string;
  createdAt: Date | string;
  authorId: string;
  author: { id: string; name: string; avatar?: string | null };
}

interface Props {
  conversations: Conv[];
  users: UserLite[];
  currentUserId: string;
  selectedId?: string;
  messages: Msg[];
}

function getTitle(conv: Conv, currentUserId: string): { name: string; subtitle: string } {
  if (conv.title) return { name: conv.title, subtitle: `${conv.participants.length} miembros` };
  const others = conv.participants.filter((p) => p.userId !== currentUserId);
  if (others.length === 0) return { name: 'Notas personales', subtitle: '' };
  if (others.length === 1) return { name: others[0].user.name, subtitle: others[0].user.email };
  return { name: others.map((o) => o.user.name.split(' ')[0]).join(', '), subtitle: `${conv.participants.length} miembros` };
}

export function ChatLayout({ conversations, users, currentUserId, selectedId, messages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [firstMsg, setFirstMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = selectedId ? conversations.find((c) => c.id === selectedId) : conversations[0];

  // Mark read + scroll cuando cambia conversación
  useEffect(() => {
    if (!active) return;
    markConversationRead(active.id).catch(() => {});
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.id, messages.length]);

  // Auto-redirect a primera conversación si no hay selección
  useEffect(() => {
    if (!selectedId && conversations[0]) {
      router.replace(`/chat?c=${conversations[0].id}`);
    }
  }, [selectedId, conversations, router]);

  const openConv = (id: string) => router.push(`/chat?c=${id}`);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    const text = draft;
    setDraft('');
    startTransition(async () => {
      try {
        await sendMessage(active.id, text);
        router.refresh();
      } catch (err: any) {
        setDraft(text);
        toast.error(err.message);
      }
    });
  };

  const createNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return toast.error('Selecciona al menos un usuario');
    startTransition(async () => {
      try {
        const res = await createConversation({
          participantIds: selectedUsers,
          firstMessage: firstMsg || undefined,
          title: selectedUsers.length > 1 ? `Grupo (${selectedUsers.length + 1})` : undefined,
        });
        toast.success('Conversación creada');
        setNewOpen(false);
        setSelectedUsers([]);
        setFirstMsg('');
        router.push(`/chat?c=${res.conversationId}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
      <div className="border-r flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">Conversaciones</p>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva conversación</DialogTitle>
              </DialogHeader>
              <form onSubmit={createNew} className="space-y-3">
                <p className="text-xs text-muted-foreground">Selecciona uno o varios miembros del equipo</p>
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
                  {users.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin compañeros activos</p>
                  ) : users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => setSelectedUsers(e.target.checked ? [...selectedUsers, u.id] : selectedUsers.filter((x) => x !== u.id))}
                      />
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials(u.name)}</AvatarFallback></Avatar>
                      <span>{u.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                    </label>
                  ))}
                </div>
                <Textarea
                  placeholder="Primer mensaje (opcional)..."
                  rows={2}
                  value={firstMsg}
                  onChange={(e) => setFirstMsg(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isPending || selectedUsers.length === 0}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Crear
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-6">
              Sin conversaciones aún. Crea la primera con el botón ＋.
            </p>
          ) : conversations.map((c) => {
            const t = getTitle(c, currentUserId);
            const lastMsg = c.messages[0];
            const myPart = c.participants.find((p) => p.userId === currentUserId);
            const isUnread = lastMsg && lastMsg.authorId !== currentUserId
              && (!myPart?.lastReadAt || new Date(lastMsg.createdAt) > new Date(myPart.lastReadAt));
            return (
              <button
                key={c.id}
                onClick={() => openConv(c.id)}
                className={cn(
                  'w-full text-left p-3 hover:bg-accent transition border-b',
                  active?.id === c.id && 'bg-accent'
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials(t.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isUnread && 'font-semibold')}>{t.name}</p>
                    {lastMsg && <p className="text-xs text-muted-foreground truncate">{lastMsg.content}</p>}
                  </div>
                  {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Selecciona una conversación o crea una nueva.
          </div>
        ) : (
          <>
            <div className="p-3 border-b">
              <p className="font-semibold text-sm">{getTitle(active, currentUserId).name}</p>
              <p className="text-xs text-muted-foreground">{getTitle(active, currentUserId).subtitle}</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Sin mensajes todavía. Sé el primero en escribir.
                </p>
              ) : messages.map((m) => {
                const mine = m.authorId === currentUserId;
                return (
                  <div key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
                    {!mine && (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">{initials(m.author.name)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn('max-w-[75%]', mine && 'text-right')}>
                      {!mine && <p className="text-[10px] text-muted-foreground mb-0.5">{m.author.name}</p>}
                      <div className={cn(
                        'inline-block rounded-2xl px-3 py-1.5 text-sm break-words',
                        mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {m.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="icon" disabled={isPending || !draft.trim()}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
