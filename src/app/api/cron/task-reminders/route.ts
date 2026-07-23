import { NextRequest, NextResponse } from 'next/server';
import { sendDueTaskReminders } from '@/lib/task-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron: recordatorios de tareas que vencen hoy o están vencidas.
 * Seguridad: header x-cron-secret = process.env.CRON_SECRET (si está definido).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sent = await sendDueTaskReminders();
  return NextResponse.json({ ok: true, sent });
}
