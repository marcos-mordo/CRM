import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Cliente Stripe perezoso. Si no hay clave configurada, lanza error solo
 * al usarlo, no en el import. Eso permite que la app arranque sin Stripe
 * (modo gratuito local) y solo falle si alguien intenta cobrar.
 */
let _client: Stripe | null = null;
export function getStripe(): Stripe {
  if (_client) return _client;
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no configurada en variables de entorno');
  }
  _client = new Stripe(STRIPE_SECRET_KEY);
  return _client;
}

export const isStripeConfigured = () => !!STRIPE_SECRET_KEY;

// Catálogo de planes — los priceId reales se configuran en Stripe Dashboard
export const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    priceId: null,
    description: 'Hasta 3 usuarios y 50 ventas/mes',
    features: ['CRM core', 'Hasta 3 marcas', 'Soporte comunidad'],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_PRICE_STARTER ?? null,
    description: 'Para agencias pequeñas',
    features: ['Hasta 10 usuarios', 'Hasta 10 marcas', 'API REST', 'Webhooks'],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 99,
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
    description: 'Para equipos en crecimiento',
    features: ['Usuarios ilimitados', 'Marcas ilimitadas', '2FA obligatorio', 'Soporte prioritario', 'SSO (próximamente)'],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 299,
    priceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    description: 'Para múltiples agencias',
    features: ['Multi-organización', 'SLA 99.9%', 'Onboarding dedicado', 'Auditoría avanzada'],
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];

export function getPlanById(id: string) {
  return PLANS.find((p) => p.id === id);
}
