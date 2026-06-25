import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { chatWithAssistant, isAIConfigured } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: 'ai_not_configured', message: 'ANTHROPIC_API_KEY no está configurada' },
      { status: 503 }
    );
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  const history = Array.isArray(body.history) ? body.history : [];
  // Validamos formato
  const validated = history
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length < 4000)
    .slice(-10); // últimas 10 entradas

  if (validated.length === 0) {
    return NextResponse.json({ error: 'bad_request', message: 'history vacío' }, { status: 400 });
  }

  try {
    const text = await chatWithAssistant(session.user.organizationId, validated);
    return NextResponse.json({ reply: text });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ai_error', message: err?.message ?? 'Error en asistente' },
      { status: 500 }
    );
  }
}
