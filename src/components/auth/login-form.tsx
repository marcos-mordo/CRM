'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

export function LoginForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        totp: totp || undefined,
        redirect: false,
      });

      if (result?.error) {
        // En NextAuth v5, los errores custom llegan como code en `result.code`
        // pero al estar redirect:false a veces vuelve como string genérico
        const code = (result as any).code ?? result.error;
        if (code === 'two_factor_required' || result.error === 'CredentialsSignin' && !needs2fa) {
          // Si no estaba en modo 2FA, probamos: quizá necesita
          setNeeds2fa(true);
          toast.info('Introduce tu código de verificación 2FA');
          return;
        }
        if (code === 'two_factor_invalid') {
          toast.error('Código 2FA inválido');
          return;
        }
        toast.error(t('invalidCredentials'));
        return;
      }

      toast.success(t('login'));
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          required
          autoComplete="email"
          disabled={needs2fa}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          disabled={needs2fa}
        />
      </div>

      {needs2fa && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="totp" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Código de verificación 2FA
          </Label>
          <Input
            id="totp"
            type="text"
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder="000000 o aaaa-bbbb"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            className="font-mono text-center text-lg tracking-widest"
            required
          />
          <p className="text-xs text-muted-foreground">
            Introduce el código de 6 dígitos de tu app autenticadora, o un código de respaldo.
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {needs2fa ? 'Verificar y entrar' : t('loginButton')}
      </Button>

      {needs2fa && (
        <button
          type="button"
          onClick={() => { setNeeds2fa(false); setTotp(''); }}
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
        >
          Volver al login
        </button>
      )}
    </form>
  );
}
