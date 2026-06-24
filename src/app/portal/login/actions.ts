'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';
import { generatePortalToken } from '@/lib/portal-auth';

const schema = z.object({
  email: z.string().email(),
});

const TOKEN_TTL_MIN = 15;

export async function requestMagicLink(input: z.infer<typeof schema>): Promise<{ ok: true }> {
  const parsed = schema.parse(input);
  const email = parsed.email.toLowerCase().trim();

  // Buscar todos los end customers con ese email y portal activado
  const customers = await prisma.endCustomer.findMany({
    where: { email, portalEnabled: true },
    include: { organization: { select: { name: true } } },
  });

  // Importante: respondemos OK aunque no exista, para no filtrar emails registrados
  for (const customer of customers) {
    const { plain, hash } = generatePortalToken();
    await prisma.portalSession.create({
      data: {
        tokenHash: hash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000),
        organizationId: customer.organizationId,
        endCustomerId: customer.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const link = `${baseUrl}/portal/verify?token=${encodeURIComponent(plain)}`;

    try {
      await sendMail({
        to: email,
        subject: `Acceso a tu área de cliente — ${customer.organization.name}`,
        html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:20px">Hola${customer.firstName ? ` ${customer.firstName}` : ''},</h1>
  <p>Has solicitado acceso a tu área de cliente en <strong>${customer.organization.name}</strong>.</p>
  <p style="text-align:center;margin:32px 0">
    <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Acceder a mi cuenta</a>
  </p>
  <p style="font-size:12px;color:#64748b">El enlace expira en ${TOKEN_TTL_MIN} minutos. Si no has solicitado esto, ignora este email.</p>
</body></html>`,
      });
    } catch (err) {
      console.error('[portal] sendMail failed', err);
    }
  }

  return { ok: true };
}
