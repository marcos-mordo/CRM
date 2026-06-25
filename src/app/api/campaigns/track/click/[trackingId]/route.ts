import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params;
  const dest = req.nextUrl.searchParams.get('u');

  if (!dest || !/^https?:\/\//.test(dest)) {
    return new NextResponse('Bad request', { status: 400 });
  }

  try {
    const tracking = await prisma.emailTracking.findUnique({
      where: { id: trackingId },
      select: { id: true, clickedAt: true, campaignId: true, variant: true },
    });

    if (tracking && !tracking.clickedAt) {
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: { clickedAt: new Date(), openedAt: tracking.id ? new Date() : new Date() },
      });
      await prisma.campaign.update({
        where: { id: tracking.campaignId },
        data: {
          clickedCount: { increment: 1 },
          ...(tracking.variant === 'A' ? { clickedA: { increment: 1 } } : {}),
          ...(tracking.variant === 'B' ? { clickedB: { increment: 1 } } : {}),
        },
      });
    }
  } catch (e) {
    console.error('click tracking failed', e);
  }

  return NextResponse.redirect(dest, 302);
}
