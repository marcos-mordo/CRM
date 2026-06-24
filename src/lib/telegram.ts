const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const isTelegramConfigured = () => !!TELEGRAM_BOT_TOKEN;

interface SendOpts {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

/**
 * Envía un mensaje vía Telegram Bot API. No bloquea ni rompe si falla.
 * Cada usuario debe vincular su chatId hablando primero con el bot.
 */
export async function sendTelegram(opts: SendOpts): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN no configurado' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: opts.chatId,
        text: opts.text,
        parse_mode: opts.parseMode ?? 'HTML',
        disable_web_page_preview: opts.disableWebPagePreview ?? true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status} ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message?.slice(0, 200) };
  }
}

/**
 * Bot username helper — para construir el link "Hablar con el bot" en la UI.
 */
export function getBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME ?? null;
}
