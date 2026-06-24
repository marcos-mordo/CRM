'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { requestMagicLink } from '@/app/portal/login/actions';

export function PortalLoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await requestMagicLink({ email });
        setSent(true);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <Mail className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="font-semibold">Revisa tu email</h2>
        <p className="text-sm text-muted-foreground">
          Si <strong>{email}</strong> está dado de alta como cliente con portal activo, te hemos enviado un enlace de acceso.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>Usar otro email</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar enlace de acceso
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        No usamos contraseñas. Te enviaremos un enlace de un solo uso.
      </p>
    </form>
  );
}
