import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { PLANS, isStripeConfigured } from '@/lib/stripe';
import { BillingActions } from '@/components/billing/billing-actions';
import { formatDate } from '@/lib/utils';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) redirect('/dashboard');

  const { success, canceled } = await searchParams;

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: session.user.organizationId },
  });

  const currentPlan = subscription?.plan ?? 'FREE';
  const stripeReady = isStripeConfigured();

  return (
    <div className="space-y-6">
      <PageHeader title="Plan y facturación" description="Gestiona la suscripción de tu organización">
        <Button variant="outline" asChild>
          <Link href="/settings">Volver a Settings</Link>
        </Button>
      </PageHeader>

      {success && (
        <Card className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-sm">
            ✓ Pago realizado. Tu suscripción se activará en unos segundos vía webhook.
          </CardContent>
        </Card>
      )}
      {canceled && (
        <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-sm">
            Pago cancelado. Tu plan actual no ha cambiado.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Plan actual</CardTitle>
              <CardDescription>{currentPlan}</CardDescription>
            </div>
            <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : subscription?.status === 'PAST_DUE' ? 'destructive' : 'secondary'}>
              {subscription?.status ?? 'FREE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {subscription?.currentPeriodEnd && (
            <p>Próxima renovación: <strong>{formatDate(subscription.currentPeriodEnd)}</strong></p>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <p className="text-amber-600">⚠ Cancelación programada al final del periodo.</p>
          )}
          {!stripeReady && (
            <p className="text-xs">
              💡 Stripe no está configurado en este entorno (falta <code>STRIPE_SECRET_KEY</code>).
              Puedes seleccionar planes para preview pero no se podrán cobrar.
            </p>
          )}
          {subscription?.stripeSubscriptionId && (
            <div className="pt-2">
              <BillingActions hasSubscription={true} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary border-2' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {isCurrent && <Badge>Actual</Badge>}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {plan.price === 0 ? 'Gratis' : `${plan.price}€`}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mes</span>}
                </p>
                <ul className="text-sm space-y-1 mt-4 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <BillingActions planId={plan.id} hasPriceId={!!plan.priceId} isCurrent={isCurrent} stripeReady={stripeReady} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
