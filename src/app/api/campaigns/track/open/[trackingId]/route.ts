import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// pixel transparente 1x1 GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params;

  // Marca como abierto solo la primera vez
  try {
    const tracking = await prisma.emailTracking.findUnique({
      where: { id: trackingId },
      select: { id: true, openedAt: true, campaignId: true, variant: true },
    });

    if (tracking && !tracking.openedAt) {
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: { openedAt: new Date() },
      });
      // Incrementa contador agregado (total y A/B)
      await prisma.campaign.update({
        where: { id: tracking.campaignId },
        data: {
          openedCount: { increment: 1 },
          ...(tracking.variant === 'A' ? { openedA: { increment: 1 } } : {}),
          ...(tracking.variant === 'B' ? { openedB: { increment: 1 } } : {}),
        },
      });
    }
  } catch (e) {
    console.error('open tracking failed', e);
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
