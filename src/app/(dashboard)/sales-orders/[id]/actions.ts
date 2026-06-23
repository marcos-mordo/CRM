'use server';

import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { AttachmentType } from '@prisma/client';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

const uploadSchema = z.object({
  saleId: z.string(),
  type: z.nativeEnum(AttachmentType),
  filename: z.string().min(1).max(200),
  mimeType: z.string().max(120),
  dataUrl: z.string(), // base64 data URL
});

export async function uploadAttachment(input: z.infer<typeof uploadSchema>) {
  const session = await requireAuth();
  const parsed = uploadSchema.parse(input);

  const sale = await prisma.sale.findFirstOrThrow({
    where: { id: parsed.saleId, organizationId: session.user.organizationId },
  });

  const match = parsed.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Formato dataUrl inválido');
  const [, , base64] = match;
  const buffer = Buffer.from(base64, 'base64');

  const orgDir = path.join(UPLOADS_ROOT, session.user.organizationId, 'sales', sale.id);
  await ensureDir(orgDir);

  const safeName = parsed.filename.replace(/[^\w.\-]/g, '_');
  const stored = `${Date.now()}-${safeName}`;
  const filepath = path.join(orgDir, stored);
  await fs.writeFile(filepath, buffer);

  const url = `/uploads/${session.user.organizationId}/sales/${sale.id}/${stored}`;

  await prisma.attachment.create({
    data: {
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      size: buffer.length,
      url,
      type: parsed.type,
      organizationId: session.user.organizationId,
      saleId: sale.id,
    },
  });

  revalidatePath(`/sales-orders/${sale.id}`);
  return { ok: true, url };
}

export async function deleteAttachment(attachmentId: string) {
  const session = await requireAuth();
  const att = await prisma.attachment.findFirstOrThrow({
    where: { id: attachmentId, organizationId: session.user.organizationId },
  });
  await prisma.attachment.delete({ where: { id: attachmentId } });

  // Borrar archivo físico (best-effort)
  try {
    const filepath = path.join(process.cwd(), 'public', att.url);
    await fs.unlink(filepath);
  } catch {
    // ignore
  }

  if (att.saleId) revalidatePath(`/sales-orders/${att.saleId}`);
  return { ok: true };
}
