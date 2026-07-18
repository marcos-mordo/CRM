import { NextRequest, NextResponse } from 'next/server';
import { syncAllEmailAccounts } from '@/lib/email-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await syncAllEmailAccounts();
  return NextResponse.json({ ok: true, ...result });
}
