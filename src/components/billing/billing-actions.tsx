'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { createBillingPortalSession, createCheckoutSession, setPlanFree } from '@/app/(dashboard)/settings/billing/actions';

interface Props {
  planId?: string;
  hasPriceId?: boolean;
  isCurrent?: boolean;
  stripeReady?: boolean;
  hasSubscription?: boolean;
}

export function BillingActions({ planId, hasPriceId, isCurrent, stripeReady, hasSubscription }: Props) {
  const [isPending, startTransition] = useTransition();

  // Botón "Gestionar suscripción" (cuando ya hay una activa)
  if (hasSubscription) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          try {
            const { url } = await createBillingPortalSession();
            window.location.href = url;
          } catch (e: any) { toast.error(e.message); }
        })}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Gestionar suscripción
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    );
  }

  // Botón "Plan actual" (deshabilitado)
  if (isCurrent) {
    return <Button className="w-full" variant="outline" disabled>Tu plan actual</Button>;
  }

  // Plan FREE: downgrade local
  if (planId === 'FREE') {
    return (
      <Button
        className="w-full"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          try {
            await setPlanFree();
            toast.success('Plan cambiado a Free');
            location.reload();
          } catch (e: any) { toast.error(e.message); }
        })}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Bajar a Free
      </Button>
    );
  }

  // Planes de pago
  if (!stripeReady) {
    return <Button className="w-full" disabled>Stripe no configurado</Button>;
  }

  if (!hasPriceId) {
    return <Button className="w-full" disabled title="Configura STRIPE_PRICE_* en el entorno">priceId pendiente</Button>;
  }

  return (
    <Button
      className="w-full"
      disabled={isPending || !planId}
      onClick={() => planId && startTransition(async () => {
        try {
          const { url } = await createCheckoutSession(planId);
          window.location.href = url;
        } catch (e: any) { toast.error(e.message); }
      })}
    >
      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      Contratar
    </Button>
  );
}
