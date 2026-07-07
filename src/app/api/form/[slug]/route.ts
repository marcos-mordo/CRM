import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';

/**
 * Endpoint público POST para submissions de web forms.
 * NO requiere auth. Crea un Lead + notifica emails configurados.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.webForm.findFirst({
    where: { slug, active: true },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!form) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  const fields = (form.fields as any[]) || [];
  const required = fields.filter((f) => f.required);
  for (const f of required) {
    if (!body[f.key]?.trim()) {
      return NextResponse.json({ error: 'missing_field', message: `Campo "${f.label}" requerido` }, { status: 400 });
    }
  }

  // Crea Lead
  const firstName = body.firstName || body.name?.split(' ')[0] || 'Sin nombre';
  const lastName = body.lastName || body.name?.split(' ').slice(1).join(' ') || '';
  const email = body.email;
  const phone = body.phone || body.tel;

  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      status: 'NEW',
      source: `WebForm: ${form.name}`,
      notes: JSON.stringify(body, null, 2),
      organizationId: form.organization.id,
    },
  });

  await prisma.webForm.update({
    where: { id: form.id },
    data: { submissions: { increment: 1 } },
  });

  // Workflows: trigger LEAD_CREATED
  const { triggerWorkflows } = await import('@/lib/workflows');
  triggerWorkflows({
    organizationId: form.organization.id,
    trigger: 'LEAD_CREATED',
    payload: {
      leadId: lead.id,
      firstName,
      lastName,
      email,
      phone,
      source: `WebForm: ${form.name}`,
    },
  });

  // Notifica por email
  if (form.notifyEmails) {
    const to = form.notifyEmails.split(',').map((s) => s.trim()).filter(Boolean);
    if (to.length > 0) {
      const html = `
        <h2>Nuevo lead desde formulario "${form.name}"</h2>
        <ul>
          ${Object.entries(body).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}
        </ul>
        <p><em>Origen: ${form.organization.name}</em></p>
      `;
      await Promise.all(to.map((email) => sendMail({ to: email, subject: `Nuevo lead: ${firstName} ${lastName}`, html }).catch(() => null)));
    }
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
