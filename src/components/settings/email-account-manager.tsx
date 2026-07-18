'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw, Unplug, Loader2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { connectEmailAccount, disconnectEmailAccount, syncMyEmail } from '@/app/(dashboard)/settings/email/actions';
import { formatDate } from '@/lib/utils';

type AccountView = {
  email: string;
  imapHost: string;
  smtpHost: string;
  active: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

export function EmailAccountManager({ account, messageCount }: { account: AccountView | null; messageCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manual, setManual] = useState(false);
  const [imapHost, setImapHost] = useState('');
  const [smtpHost, setSmtpHost] = useState('');

  const connect = () => {
    startTransition(async () => {
      try {
        await connectEmailAccount({
          email,
          password,
          imapHost: manual ? imapHost : undefined,
          smtpHost: manual ? smtpHost : undefined,
        });
        toast.success('Email conectado y verificado ✓');
        setPassword('');
        router.refresh();
      } catch (e: any) { toast.error(e.message, { duration: 8000 }); }
    });
  };

  const sync = () => {
    startTransition(async () => {
      try {
        const r: any = await syncMyEmail();
        toast.success(`Sincronizado: ${r.imported} nuevos, ${r.matched} vinculados a contactos`);
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const disconnect = () => {
    if (!confirm('¿Desconectar tu email? El historial importado se conserva.')) return;
    startTransition(async () => {
      await disconnectEmailAccount();
      toast.success('Desconectado');
      router.refresh();
    });
  };

  if (account) {
    return (
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> {account.email}</CardTitle>
          {account.lastError
            ? <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>
            : <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">ÚLTIMA SINCRONIZACIÓN</p>
              <p>{account.lastSyncAt ? formatDate(account.lastSyncAt) : 'Nunca'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">EMAILS IMPORTADOS</p>
              <p>{messageCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IMAP</p>
              <p className="font-mono text-xs">{account.imapHost}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SMTP</p>
              <p className="font-mono text-xs">{account.smtpHost}</p>
            </div>
          </div>

          {account.lastError && (
            <div className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded p-3">
              {account.lastError}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={sync} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar ahora
            </Button>
            <Button variant="outline" onClick={disconnect} disabled={pending} className="text-destructive">
              <Unplug className="h-4 w-4" /> Desconectar
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground border-t pt-3">
            La bandeja se sincroniza automáticamente cada 10 minutos con la app abierta
            (y cada hora en despliegues cloud). Los emails se vinculan al contacto cuyo
            email coincide con el remitente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Conectar mi buzón</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tu email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@gmail.com" />
        </div>
        <div>
          <Label>Contraseña de aplicación</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
        </div>

        <details className="text-xs text-muted-foreground border border-dashed rounded-lg p-3">
          <summary className="cursor-pointer font-medium flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" /> ¿Qué es una contraseña de aplicación?
          </summary>
          <div className="mt-2 space-y-2">
            <p>Por seguridad, Gmail y Outlook no permiten usar tu contraseña normal en apps externas. Genera una específica (requiere tener 2FA activado en tu cuenta):</p>
            <p><strong>Gmail:</strong> myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación</p>
            <p><strong>Outlook:</strong> account.microsoft.com → Seguridad → Opciones avanzadas → Contraseñas de aplicación</p>
            <p>BrandHub la guarda cifrada (AES-256) y solo la usa para leer tu bandeja y enviar en tu nombre.</p>
          </div>
        </details>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Configurar servidores manualmente (correo corporativo)
        </label>
        {manual && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Servidor IMAP</Label>
              <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.miempresa.com" />
            </div>
            <div>
              <Label>Servidor SMTP</Label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.miempresa.com" />
            </div>
          </div>
        )}

        <Button onClick={connect} disabled={pending || !email || !password} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Conectar y verificar
        </Button>
      </CardContent>
    </Card>
  );
}
