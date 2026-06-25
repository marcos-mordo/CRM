'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED = [
  '¿Cuánto vendí este mes?',
  '¿Quién es mi mejor representante?',
  '¿Cuántas comisiones tengo pendientes?',
  '¿Leads sin actividad en 14 días?',
];

export function AiChatBubble({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isPending]);

  if (!enabled) return null;

  const ask = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft('');

    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((m) => [...m, { role: 'assistant', content: `_Error: ${data.message ?? 'no disponible'}_` }]);
          return;
        }
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      } catch (err: any) {
        setMessages((m) => [...m, { role: 'assistant', content: `_Error de red: ${err.message}_` }]);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition"
          title="Pregunta a la AI"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">Asistente AI</SheetTitle>
        <div className="border-b p-4 flex items-center gap-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Asistente BrandHub</p>
            <p className="text-xs text-muted-foreground">Pregúntale sobre tus datos · Claude</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground py-4">
                Pregúntame cualquier cosa sobre tus ventas, comisiones, clientes o tareas.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Pruebas rápidas:</p>
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="w-full text-left text-xs p-2 border rounded-lg hover:bg-accent transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                  dangerouslySetInnerHTML={{
                    __html: m.content
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
              </div>
            ))
          )}
          {isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin inline" /> pensando…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(draft); }}
          className="p-3 border-t flex gap-2"
        >
          <Input
            placeholder="Escribe tu pregunta..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !draft.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
