import { LoginForm } from '@/components/auth/login-form';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand-logo';
import { SSO_AVAILABLE } from '@/auth';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function LoginPage() {
  const t = await getTranslations('Auth');

  return (
    <Card className="shadow-xl border-slate-200/60 dark:border-slate-800">
      <CardHeader className="space-y-2 text-center pb-6">
        <BrandLogo size={56} className="mx-auto mb-2 shadow-lg rounded-xl" />
        <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <SsoButtons google={SSO_AVAILABLE.google} microsoft={SSO_AVAILABLE.microsoft} />
        <LoginForm />

        {/* Hint de cuenta demo - solo visible si hay datos demo (no producción real) */}
        <details className="mt-4 text-xs text-muted-foreground border border-dashed rounded-lg p-3">
          <summary className="cursor-pointer font-medium">¿Es tu primera vez? Cuentas demo</summary>
          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <p><strong>Owner:</strong> admin@acme.com / admin1234</p>
            <p><strong>Manager:</strong> maria@acme.com / admin1234</p>
            <p><strong>Agente:</strong> luis@acme.com / admin1234</p>
            <p className="font-sans text-[10px] pt-1">O <code>admin@brandhub.local / admin1234</code> en app desktop recién instalada.</p>
          </div>
        </details>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t('register')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
