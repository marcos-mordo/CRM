import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getPublicKey } from '@/lib/push';

export const runtime = 'nodejs';

export async function GET() {
  const key = getPublicKey();
  if (!key) return NextResponse.json({ error: 'push_not_configured' }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      endpoint: body.endpoint,
      keyP256dh: body.keys.p256dh,
      keyAuth: body.keys.auth,
      userAgent: req.headers.get('user-agent') ?? undefined,
      userId: session.user.id,
      organizationId: session.user.organizationId,
    },
    update: {
      keyP256dh: body.keys.p256dh,
      keyAuth: body.keys.auth,
      userId: session.user.id,
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await requireAuth();
  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (!endpoint) return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
