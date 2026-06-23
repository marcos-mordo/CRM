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
