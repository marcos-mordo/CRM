'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdmin } from '@/lib/auth-helpers';
import { getStripe, getPlanById, isStripeConfigured } from '@/lib/stripe';

const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export async function createCheckoutSession(planId: string): Promise<{ url: string }> {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo admins pueden gestionar el plan');
  if (!isStripeConfigured()) {
    throw new Error('Stripe no está configurado en este entorno. Configura STRIPE_SECRET_KEY.');
  }

  const plan = getPlanById(planId);
  if (!plan || !plan.priceId) throw new Error('Plan no disponible o sin priceId configurado');

  const stripe = getStripe();
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
  });

  // Crear o reutilizar customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: session.user.email,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings/billing?success=1`,
    cancel_url: `${APP_URL}/settings/billing?canceled=1`,
    allow_promotion_codes: true,
    metadata: { organizationId: org.id, planId: plan.id },
    subscription_data: {
      metadata: { organizationId: org.id, planId: plan.id },
    },
  });

  if (!checkout.url) throw new Error('Stripe no devolvió URL de checkout');
  return { url: checkout.url };
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo admins');
  if (!isStripeConfigured()) throw new Error('Stripe no configurado');

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
  });
  if (!org.stripeCustomerId) throw new Error('No hay customer Stripe asociado todavía');

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/settings/billing`,
  });
  return { url: portal.url };
}

/**
 * Downgrade local a FREE (sin tocar Stripe).
 * Útil cuando aún no configuras Stripe en el entorno o quieres marcar
 * una org como gratuita manualmente.
 */
export async function setPlanFree() {
  const session = await requireAuth();
  if (!isAdmin(session.user.role)) throw new Error('Solo admins');
  await prisma.subscription.upsert({
    where: { organizationId: session.user.organizationId },
    update: { plan: 'FREE', status: 'ACTIVE', stripePriceId: null, stripeSubscriptionId: null },
    create: { organizationId: session.user.organizationId, plan: 'FREE', status: 'ACTIVE' },
  });
  revalidatePath('/settings/billing');
  return { ok: true };
}
