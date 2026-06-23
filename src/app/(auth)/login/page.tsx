import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand-logo';
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
        <LoginForm />
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
