import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook que recibe updates de Telegram. Configurar con:
 *   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
 *     -d "url=https://tudominio.com/api/telegram/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>"
 *
 * Comandos soportados:
 *   /start <code>  → vincula este chat al usuario que generó el code
 *   /status        → muestra el estado del usuario vinculado
 */
export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return NextResponse.json({ ok: true, skipped: 'no secret configured' });
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const message = update.message;
  if (!message || !message.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = String(message.text).trim();

  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      await sendTelegram({
        chatId,
        text: 'Hola! Para vincular tu cuenta, ve a BrandHub → Mi perfil → Telegram, copia tu código de vinculación y envíalo aquí como /start <codigo>.',
      });
      return NextResponse.json({ ok: true });
    }
    // El code es un hash del userId — buscamos al user que tenga ese hash
    const users = await prisma.user.findMany({ where: { active: true } });
    const match = users.find((u) => crypto.createHash('sha256').update(`${u.id}:${process.env.NEXTAUTH_SECRET ?? ''}`).digest('hex').slice(0, 12) === code);
    if (!match) {
      await sendTelegram({ chatId, text: 'Código de vinculación inválido o caducado.' });
      return NextResponse.json({ ok: true });
    }
    await prisma.user.update({ where: { id: match.id }, data: { telegramChatId: chatId } });
    await sendTelegram({
      chatId,
      text: `✅ Cuenta vinculada como <b>${match.name}</b>. A partir de ahora recibirás aquí notificaciones importantes.`,
    });
    return NextResponse.json({ ok: true });
  }

  if (text === '/status') {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    await sendTelegram({
      chatId,
      text: user
        ? `Estás vinculado como <b>${user.name}</b> (${user.email}).`
        : 'Este chat no está vinculado a ningún usuario. Usa /start &lt;codigo&gt;.',
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
