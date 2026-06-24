import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand-logo';
import { PortalLoginForm } from '@/components/portal/login-form';

export default function PortalLoginPage() {
  return (
    <Card className="shadow-xl border-slate-200/60 dark:border-slate-800 w-full max-w-md">
      <CardHeader className="space-y-2 text-center pb-6">
        <BrandLogo size={56} className="mx-auto mb-2 shadow-lg rounded-xl" />
        <CardTitle className="text-2xl">Área de cliente</CardTitle>
        <CardDescription>Introduce tu email y te enviaremos un enlace para acceder.</CardDescription>
      </CardHeader>
      <CardContent>
        <PortalLoginForm />
      </CardContent>
    </Card>
  );
}
