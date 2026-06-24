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
