import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api-auth';
import { notifyManagers } from '@/lib/notifications';
import { dispatchWebhook } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const leadSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60).optional().default(''),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  jobTitle: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  // Soporte para formularios HTML estándar: cualquier campo extra va a notes
  extra: z.record(z.string(), z.any()).optional(),
});

/**
 * Endpoint público para captura de leads desde landing pages, formularios
 * web, integraciones externas. Requiere API token con scope WRITE_CUSTOMERS
 * o ADMIN_ALL.
 *
 * Ejemplo desde una landing:
 *   fetch('https://brandhub.app/api/v1/inbound/leads', {
 *     method: 'POST',
 *     headers: { 'Authorization': 'Bearer bh_...', 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ firstName: 'Juan', email: 'juan@email.com', source: 'web-form' })
 *   })
 */
export async function POST(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['WRITE_CUSTOMERS']);
  if (ctx instanceof NextResponse) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  if (!parsed.data.email && !parsed.data.phone) {
    return NextResponse.json(
      { error: 'bad_request', message: 'Se requiere al menos email o teléfono' },
      { status: 400 }
    );
  }

  // Dedupe: si ya existe lead con el mismo email, devolvemos el existente
  if (parsed.data.email) {
    const existing = await prisma.lead.findFirst({
      where: { organizationId: ctx.organizationId, email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { id: existing.id, status: existing.status, deduped: true },
        { status: 200 }
      );
    }
  }

  // Composer notas con extras
  const extraNotes = parsed.data.extra
    ? Object.entries(parsed.data.extra)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join('\n')
    : '';
  const fullNotes = [parsed.data.notes, extraNotes].filter(Boolean).join('\n\n');

  // Round-robin: asigna automáticamente a un rep si está activado
  const { pickRoundRobinOwner } = await import('@/lib/sales-intel');
  const rrOwner = await pickRoundRobinOwner(ctx.organizationId);

  const lead = await prisma.lead.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      jobTitle: parsed.data.jobTitle,
      source: parsed.data.source ?? 'web-inbound',
      status: 'NEW',
      estimatedValue: parsed.data.estimatedValue,
      notes: fullNotes || null,
      ownerId: rrOwner,
      organizationId: ctx.organizationId,
    },
  });

  // Workflows: trigger LEAD_CREATED
  const { triggerWorkflows } = await import('@/lib/workflows');
  triggerWorkflows({
    organizationId: ctx.organizationId,
    trigger: 'LEAD_CREATED',
    payload: {
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    },
  });

  // Notificar a managers
  await notifyManagers({
    organizationId: ctx.organizationId,
    type: 'SYSTEM',
    title: `Nuevo lead web: ${lead.firstName} ${lead.lastName}`.trim(),
    message: `Fuente: ${lead.source}${lead.email ? ` · ${lead.email}` : ''}`,
    link: '/leads',
    metadata: { leadId: lead.id },
  });

  // Disparar webhook saliente CUSTOMER_CREATED (reusamos el evento)
  await dispatchWebhook({
    organizationId: ctx.organizationId,
    event: 'CUSTOMER_CREATED',
    payload: {
      type: 'lead',
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
    },
  });

  return NextResponse.json(
    { id: lead.id, status: lead.status, created: true },
    { status: 201 }
  );
}
