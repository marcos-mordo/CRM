import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { TwoFactorPanel } from '@/components/me/two-factor-panel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function TwoFactorPage() {
  const session = await requireAuth();

  const tf = await prisma.userTwoFactor.findUnique({
    where: { userId: session.user.id },
    select: { enabled: true, enabledAt: true, lastUsedAt: true },
  });

  const enabled = !!tf?.enabled;

  return (
    <div className="space-y-6">
      <PageHeader title="Verificación en dos pasos (2FA)" description="Añade una capa extra de seguridad a tu cuenta.">
        <Button variant="outline" asChild>
          <Link href="/me">Volver</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {enabled ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-green-600" /> 2FA activado
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-amber-600" /> 2FA desactivado
                  </>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {enabled
                  ? `Activado el ${tf?.enabledAt ? formatDate(tf.enabledAt) : '?'}.`
                  : 'Recomendado para cuentas con permisos administrativos.'}
              </CardDescription>
            </div>
            <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'Protegido' : 'Sin proteger'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TwoFactorPanel enabled={enabled} userEmail={session.user.email!} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>1. Instala una app autenticadora compatible con TOTP en tu móvil:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>Google Authenticator (iOS / Android)</li>
            <li>Microsoft Authenticator</li>
            <li>Authy</li>
            <li>1Password / Bitwarden (integrado)</li>
          </ul>
          <p>2. Escanea el código QR con tu app — almacenará una clave secreta de 30 segundos.</p>
          <p>3. Introduce el código de 6 dígitos que muestra la app para activar.</p>
          <p>4. Guarda los <strong>códigos de respaldo</strong> en lugar seguro: úsalos si pierdes el móvil.</p>
        </CardContent>
      </Card>
    </div>
  );
}
