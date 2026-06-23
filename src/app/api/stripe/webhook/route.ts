import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { SubscriptionStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled': return 'CANCELED';
    case 'incomplete': return 'INCOMPLETE';
    case 'incomplete_expired': return 'INCOMPLETE_EXPIRED';
    case 'unpaid': return 'UNPAID';
    case 'paused': return 'PAUSED';
    default: return 'INCOMPLETE';
  }
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  const body = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: 'invalid_signature', message: err?.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const planId = session.metadata?.planId;
        if (orgId && session.subscription) {
          const sub = (await stripe.subscriptions.retrieve(session.subscription as string)) as any;
          await prisma.subscription.upsert({
            where: { organizationId: orgId },
            update: {
              plan: (planId ?? 'STARTER') as any,
              status: mapStatus(sub.status),
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            },
            create: {
              organizationId: orgId,
              plan: (planId ?? 'STARTER') as any,
              status: mapStatus(sub.status),
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const orgId = sub.metadata?.organizationId;
        if (orgId) {
          await prisma.subscription.updateMany({
            where: { organizationId: orgId },
            data: {
              status: mapStatus(sub.status),
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await prisma.subscription.updateMany({
          where: { organization: { stripeCustomerId: customerId } },
          data: { status: 'PAST_DUE' },
        });
        break;
      }

      default:
        // Ignorar otros eventos
        break;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] handler error', err);
    // Devolvemos 200 igual para que Stripe no reintente indefinidamente por bugs de DB
    return NextResponse.json({ received: true, warning: 'handler_failed' });
  }

  return NextResponse.json({ received: true });
}
