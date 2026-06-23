import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand-logo';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function RegisterPage() {
  const t = await getTranslations('Auth');

  return (
    <Card className="shadow-xl border-slate-200/60 dark:border-slate-800">
      <CardHeader className="space-y-2 text-center pb-6">
        <BrandLogo size={56} className="mx-auto mb-2 shadow-lg rounded-xl" />
        <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
        <CardDescription>{t('registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t('login')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
