import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const isAIConfigured = () => !!ANTHROPIC_API_KEY;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `Eres un asistente comercial experto en CRM y ventas B2B.
Analiza los datos de BrandHub (CRM multi-marca para agencias) y devuelve insights ACCIONABLES.
Sé conciso (máx 200 palabras) y específico. Habla en español, segunda persona ("tú").
Estructura tu respuesta como:
1. **Lo más relevante** (1-2 líneas)
2. **Sugerencias** (2-3 bullets accionables con nombres concretos)
3. **Riesgo a vigilar** (1 frase opcional si aplica)
No inventes datos: usa SOLO los proporcionados.`;

interface InsightContext {
  orgName: string;
  period: string;
  salesCount: number;
  salesTotal: number;
  commissionsPending: number;
  topRep?: { name: string; total: number };
  topBrand?: { name: string; total: number };
  pendingSignSales: number;
  newCustomers: number;
  currency: string;
}

interface LeadScoreContext {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  source?: string | null;
  status: string;
  estimatedValue?: number | null;
  notes?: string | null;
  daysSinceCreated: number;
  activitiesCount: number;
}

const LEAD_SCORE_PROMPT = `Eres un experto en calificación de leads B2B (BANT framework: Budget, Authority, Need, Timing).
Analiza el lead y devuelve un JSON estricto con esta forma:
{
  "probability": <0-100, probabilidad de conversión a cliente>,
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "<2-3 frases en español, qué señales encontraste>",
  "suggestion": "<1-2 acciones concretas para el comercial, en imperativo>"
}
Devuelve SOLO el JSON, sin markdown, sin comentarios.

Criterios:
- Falta email Y teléfono → priority LOW, probability < 25
- Datos B2B claros (empresa + cargo) → suma probabilidad
- jobTitle de decisión (CEO, CTO, Director, Manager) → priority HIGH
- Fuente orgánica/referido > anuncio
- > 14 días sin actividad → baja probability
- Estimated value alto (>10K) + datos completos → priority HIGH`;

export async function scoreLead(ctx: LeadScoreContext): Promise<{ probability: number; priority: string; reasoning: string; suggestion: string }> {
  const client = getClient();
  const prompt = `Lead a evaluar:
- Nombre: ${ctx.firstName} ${ctx.lastName}
- Email: ${ctx.email ?? '(sin email)'}
- Teléfono: ${ctx.phone ?? '(sin teléfono)'}
- Empresa: ${ctx.company ?? '(sin empresa)'}
- Cargo: ${ctx.jobTitle ?? '(sin cargo)'}
- Origen: ${ctx.source ?? 'desconocido'}
- Estado actual: ${ctx.status}
- Valor estimado: ${ctx.estimatedValue ? `${ctx.estimatedValue.toFixed(2)} €` : 'sin estimar'}
- Días desde creación: ${ctx.daysSinceCreated}
- Actividades registradas: ${ctx.activitiesCount}
- Notas: ${ctx.notes ?? '(sin notas)'}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: [{ type: 'text', text: LEAD_SCORE_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Respuesta AI no contiene JSON');
  const parsed = JSON.parse(match[0]);
  return {
    probability: Math.max(0, Math.min(100, parseInt(parsed.probability, 10) || 0)),
    priority: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority) ? parsed.priority : 'MEDIUM',
    reasoning: String(parsed.reasoning ?? '').slice(0, 500),
    suggestion: String(parsed.suggestion ?? '').slice(0, 500),
  };
}

// ============================================
// CHAT CONVERSACIONAL con tool use
// ============================================

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const CHAT_SYSTEM = `Eres el asistente de BrandHub, un CRM multi-marca. Respondes preguntas del usuario sobre SUS datos.
Tienes acceso a 6 herramientas para consultar la base de datos. Úsalas cuando el usuario pregunte por números, listas o estadísticas.
Si la respuesta requiere un cálculo, usa la herramienta y luego explica el resultado.
Sé conciso (máx 150 palabras), en español castellano neutro. Usa **negritas** para destacar.
NO inventes datos. Si una herramienta falla o no hay datos, dilo.`;

const TOOLS: any[] = [
  {
    name: 'get_sales_summary',
    description: 'Resumen de ventas en un periodo. Devuelve count, total, comisión total.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días hacia atrás desde hoy (1-365)' },
        status: { type: 'string', enum: ['ALL', 'SIGNED', 'ACTIVE', 'DRAFT'] },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_top_reps',
    description: 'Top N representantes por comisión generada en periodo.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '1-10' },
        days: { type: 'number', description: 'Días hacia atrás' },
      },
      required: ['limit', 'days'],
    },
  },
  {
    name: 'get_top_brands',
    description: 'Top N marcas por facturación.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        days: { type: 'number' },
      },
      required: ['limit', 'days'],
    },
  },
  {
    name: 'count_pending',
    description: 'Cuenta entidades pendientes (tareas, ventas borrador, comisiones por aprobar).',
    input_schema: {
      type: 'object',
      properties: {
        what: { type: 'string', enum: ['tasks', 'sales_unsigned', 'commissions_pending'] },
      },
      required: ['what'],
    },
  },
  {
    name: 'find_customer',
    description: 'Busca un cliente final por nombre, email o DNI/CIF. Devuelve datos básicos + count de ventas.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_leads_overdue',
    description: 'Leads sin actividad en N días.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number' },
      },
      required: ['days'],
    },
  },
];

async function executeTool(name: string, args: any, orgId: string): Promise<string> {
  try {
    const now = new Date();
    if (name === 'get_sales_summary') {
      const days = Math.min(365, Math.max(1, args.days));
      const since = new Date(now.getTime() - days * 86400000);
      const status = args.status;
      const where: Prisma.SaleWhereInput = {
        organizationId: orgId,
        saleDate: { gte: since },
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
      };
      const agg = await prisma.sale.aggregate({
        where,
        _sum: { total: true, totalCommission: true },
        _count: true,
      });
      return JSON.stringify({
        days,
        status: status ?? 'ALL',
        sales_count: agg._count,
        total_revenue: Number(agg._sum.total ?? 0),
        total_commission: Number(agg._sum.totalCommission ?? 0),
      });
    }
    if (name === 'get_top_reps') {
      const limit = Math.min(10, Math.max(1, args.limit));
      const since = new Date(now.getTime() - Math.min(365, Math.max(1, args.days)) * 86400000);
      const grouped = await prisma.commission.groupBy({
        by: ['representativeId'],
        where: { organizationId: orgId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });
      const users = await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.representativeId) } },
        select: { id: true, name: true },
      });
      return JSON.stringify(grouped.map((g) => ({
        name: users.find((u) => u.id === g.representativeId)?.name ?? '?',
        commission_total: Number(g._sum.amount ?? 0),
        sales_count: g._count,
      })));
    }
    if (name === 'get_top_brands') {
      const limit = Math.min(10, Math.max(1, args.limit));
      const since = new Date(now.getTime() - Math.min(365, Math.max(1, args.days)) * 86400000);
      const grouped = await prisma.sale.groupBy({
        by: ['brandId'],
        where: { organizationId: orgId, status: { in: ['SIGNED', 'ACTIVE'] }, saleDate: { gte: since } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: limit,
      });
      const brands = await prisma.brand.findMany({
        where: { id: { in: grouped.map((g) => g.brandId) } },
        select: { id: true, name: true },
      });
      return JSON.stringify(grouped.map((g) => ({
        name: brands.find((b) => b.id === g.brandId)?.name ?? '?',
        revenue: Number(g._sum.total ?? 0),
        sales_count: g._count,
      })));
    }
    if (name === 'count_pending') {
      if (args.what === 'tasks') {
        const n = await prisma.task.count({
          where: { organizationId: orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        });
        return JSON.stringify({ count: n });
      }
      if (args.what === 'sales_unsigned') {
        const n = await prisma.sale.count({
          where: { organizationId: orgId, status: { in: ['DRAFT', 'PENDING_SIGN'] } },
        });
        return JSON.stringify({ count: n });
      }
      if (args.what === 'commissions_pending') {
        const agg = await prisma.commission.aggregate({
          where: { organizationId: orgId, status: { in: ['PENDING', 'APPROVED'] } },
          _sum: { amount: true },
          _count: true,
        });
        return JSON.stringify({ count: agg._count, amount: Number(agg._sum.amount ?? 0) });
      }
    }
    if (name === 'find_customer') {
      const q = String(args.query).trim();
      const customers = await prisma.endCustomer.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { companyName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { taxId: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { _count: { select: { sales: true } } },
      });
      return JSON.stringify(customers.map((c) => ({
        id: c.id,
        name: c.isCompany ? c.companyName : `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
        taxId: c.taxId,
        email: c.email,
        sales_count: c._count.sales,
      })));
    }
    if (name === 'get_leads_overdue') {
      const days = Math.min(365, Math.max(1, args.days));
      const since = new Date(now.getTime() - days * 86400000);
      const n = await prisma.lead.count({
        where: {
          organizationId: orgId,
          status: { in: ['NEW', 'CONTACTED'] },
          updatedAt: { lt: since },
        },
      });
      return JSON.stringify({ count: n, days_since_update: days });
    }
    return JSON.stringify({ error: 'unknown_tool' });
  } catch (err: any) {
    return JSON.stringify({ error: 'tool_failed', message: err?.message?.slice(0, 200) });
  }
}

export async function chatWithAssistant(orgId: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const client = getClient();
  let messages: any[] = history.map((m) => ({ role: m.role, content: m.content }));

  // Hasta 5 rondas de tool use
  for (let round = 0; round < 5; round++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: [{ type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS as any,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b: any) => b.type === 'tool_use');
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const result = await executeTool((tu as any).name, (tu as any).input, orgId);
        toolResults.push({ type: 'tool_result', tool_use_id: (tu as any).id, content: result });
      }
      messages = [...messages, { role: 'assistant', content: response.content }, { role: 'user', content: toolResults }];
      continue;
    }

    const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
    return text || 'Sin respuesta.';
  }
  return 'El asistente excedió el límite de pasos. Intenta una pregunta más simple.';
}

export async function generateInsights(ctx: InsightContext): Promise<string> {
  const client = getClient();
  const userPrompt = `Datos de "${ctx.orgName}" del ${ctx.period}:
- Ventas firmadas: ${ctx.salesCount} (total ${ctx.salesTotal.toFixed(2)} ${ctx.currency})
- Comisiones pendientes de cobro/aprobación: ${ctx.commissionsPending.toFixed(2)} ${ctx.currency}
- Ventas en borrador o pendientes de firma: ${ctx.pendingSignSales}
- Clientes finales nuevos: ${ctx.newCustomers}
${ctx.topRep ? `- Mejor representante: ${ctx.topRep.name} (${ctx.topRep.total.toFixed(2)} ${ctx.currency} en comisiones)` : ''}
${ctx.topBrand ? `- Marca con más ventas: ${ctx.topBrand.name} (${ctx.topBrand.total.toFixed(2)} ${ctx.currency})` : ''}

Dame insights y sugerencias.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('\n');
  return text || 'Sin respuesta del asistente.';
}
