'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Send, Loader2 } from 'lucide-react';
import { sendContactEmail } from '@/app/(dashboard)/settings/email/actions';

export function ComposeEmailButton({ contactId, contactName, contactEmail }: { contactId: string; contactName: string; contactEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = () => {
    startTransition(async () => {
      try {
        await sendContactEmail({ contactId, subject, body });
        toast.success(`Email enviado a ${contactName} y registrado en su historial`);
        setOpen(false); setSubject(''); setBody('');
        router.refresh();
      } catch (e: any) { toast.error(e.message, { duration: 7000 }); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Mail className="h-4 w-4" /> Email</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email a {contactName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Para: <span className="font-mono">{contactEmail}</span></div>
          <div>
            <Label>Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del email" />
          </div>
          <div>
            <Label>Mensaje</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder={`Hola ${contactName},\n\n`} />
          </div>
          <Button onClick={send} disabled={pending || !subject.trim() || !body.trim()} className="w-full">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar desde mi cuenta
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Se envía por tu email conectado y queda registrado en el historial del contacto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
