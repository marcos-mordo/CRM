import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function detectType(mime: string): 'IMAGE' | 'DOCUMENT' | 'PDF' | 'OTHER' {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('word') || mime.includes('excel') || mime.includes('sheet') || mime === 'text/plain') return 'DOCUMENT';
  return 'OTHER';
}

/**
 * Sube un archivo adjunto. Multipart o base64.
 * Body: FormData con file + entity + entityId
 * Guarda en la BD como data:url (para simplicidad + portabilidad; migrar a S3
 * en producción cuando el uso supere ~50MB por org).
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const file = form.get('file') as File | null;
  const entity = String(form.get('entity') ?? '');
  const entityId = String(form.get('entityId') ?? '');

  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 });
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file_too_big', message: 'Máx 10 MB' }, { status: 413 });
  }
  if (!['contact', 'deal', 'sale'].includes(entity)) {
    return NextResponse.json({ error: 'invalid_entity' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${buf.toString('base64')}`;

  const created = await prisma.attachment.create({
    data: {
      filename: file.name || 'archivo',
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      type: detectType(file.type || '') as any,
      url: dataUrl,
      uploaderId: session.user.id,
      organizationId: orgId,
      ...(entity === 'contact' ? { contactId: entityId } : {}),
      ...(entity === 'deal' ? { dealId: entityId } : {}),
      ...(entity === 'sale' ? { saleId: entityId } : {}),
    },
    select: { id: true, filename: true, size: true, mimeType: true, type: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, attachment: created });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const att = await prisma.attachment.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!att) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Solo uploader o admin puede borrar
  if (att.uploaderId !== session.user.id && !['OWNER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
