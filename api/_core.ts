import type AnthropicNS from '@anthropic-ai/sdk';
import { labelAnalysisSchema, type AnalyzeInput, type AnalyzeResult } from './_labelSchema';

// IMPORTANTE: esta función serverless es AUTOCONTENIDA. No importa nada de
// `../src` porque Vercel no incluye esos archivos en el bundle de la función.
// Los SDK de IA se cargan de forma DIFERIDA (dynamic import) dentro de cada
// proveedor, para no cargar SDK pesados al arrancar (p. ej. en la verificación GET).

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BASE64_BYTES = 6 * 1024 * 1024; // ~6 MB de imagen decodificada

type Provider = 'google' | 'anthropic';

function hasGoogleKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}
function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Proveedor activo según AI_PROVIDER y las claves disponibles. */
function activeProvider(): Provider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === 'google') return hasGoogleKey() ? 'google' : null;
  if (explicit === 'anthropic') return hasAnthropicKey() ? 'anthropic' : null;
  if (hasGoogleKey()) return 'google';
  if (hasAnthropicKey()) return 'anthropic';
  return null;
}

export function isAiConfigured(): boolean {
  return activeProvider() !== null;
}

const KEYS_HINT =
  'productName, brand, servingSize, servingUnit (g|ml|unidad|porcion), servingsPerContainer, ' +
  'calories, protein, carbs, fat, fiber, sugar, sodium (mg), confidence (0-1), warnings (array).';

function buildPrompt(productName?: string): string {
  return [
    'Extrae la información de esta tabla nutricional a partir de la foto.',
    'Devuelve SIEMPRE los valores POR PORCIÓN (no por 100 g si la porción es distinta).',
    'Si un dato no es legible o no aparece, ponlo en null; NO inventes valores.',
    'El sodio va en miligramos. "confidence" es un número entre 0 y 1.',
    'Añade textos en "warnings" si la imagen está borrosa, no se ve la porción,',
    'hay varias columnas (por porción vs por 100 g), o los macros parecen inconsistentes.',
    productName ? `El usuario indica que el producto es: "${productName}".` : '',
    `Responde SOLO con un objeto JSON con estas claves: ${KEYS_HINT}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Extrae el primer objeto JSON de un texto (tolera fences ```json). */
function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Proveedor: Google Gemini (nivel gratuito) ────────────────────────────────
async function analyzeWithGoogle(input: AnalyzeInput): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: 'Falta la clave de Gemini.' };
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType: input.mimeType, data: input.base64 } },
        { text: buildPrompt(input.productName) },
      ],
      config: { responseMimeType: 'application/json' },
    });
    const json = extractJson(response.text ?? '');
    if (json == null) return { ok: false, status: 502, error: 'La IA no devolvió un JSON válido.' };
    const parsed = labelAnalysisSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, status: 502, error: 'La respuesta de la IA no superó la validación.' };
    }
    return { ok: true, analysis: parsed.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(msg)) {
      return { ok: false, status: 429, error: 'Límite gratuito de Gemini alcanzado. Intenta más tarde.' };
    }
    if (/api key|permission|unauthor|401|403|invalid/i.test(msg)) {
      return { ok: false, status: 500, error: 'La clave de Gemini del servidor es inválida.' };
    }
    if (/not found|not_found|model/i.test(msg)) {
      return { ok: false, status: 500, error: `El modelo "${model}" no está disponible. Cambia GEMINI_MODEL.` };
    }
    return { ok: false, status: 502, error: 'El proveedor de IA (Gemini) devolvió un error.' };
  }
}

// ── Proveedor: Anthropic Claude ──────────────────────────────────────────────
const ANTHROPIC_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    productName: { type: ['string', 'null'] },
    brand: { type: ['string', 'null'] },
    servingSize: { type: ['number', 'null'] },
    servingUnit: { type: ['string', 'null'], enum: ['g', 'ml', 'unidad', 'porcion', null] },
    servingsPerContainer: { type: ['number', 'null'] },
    calories: { type: ['number', 'null'] },
    protein: { type: ['number', 'null'] },
    carbs: { type: ['number', 'null'] },
    fat: { type: ['number', 'null'] },
    fiber: { type: ['number', 'null'] },
    sugar: { type: ['number', 'null'] },
    sodium: { type: ['number', 'null'] },
    confidence: { type: 'number' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['confidence', 'warnings'],
};

async function analyzeWithAnthropic(input: AnalyzeInput): Promise<AnalyzeResult> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  try {
    const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      tools: [
        {
          name: 'registrar_etiqueta',
          description: 'Registra los datos nutricionales por porción extraídos de la etiqueta.',
          input_schema: ANTHROPIC_TOOL_SCHEMA as unknown as AnthropicNS.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'registrar_etiqueta' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: input.base64,
              },
            },
            { type: 'text', text: buildPrompt(input.productName) },
          ],
        },
      ],
    });
    const toolBlock = message.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { ok: false, status: 502, error: 'La IA no devolvió datos estructurados.' };
    }
    const parsed = labelAnalysisSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      return { ok: false, status: 502, error: 'La respuesta de la IA no superó la validación.' };
    }
    return { ok: true, analysis: parsed.data };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, status: 500, error: 'La clave de Anthropic del servidor es inválida.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: 'Límite de uso de IA alcanzado. Intenta más tarde.' };
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, status: 502, error: 'El proveedor de IA devolvió un error.' };
    }
    return { ok: false, status: 500, error: 'Error inesperado al analizar la etiqueta.' };
  }
}

/**
 * Lógica central del análisis de etiqueta (independiente del framework).
 * La usan el endpoint de Vercel y el middleware de desarrollo. El proveedor de
 * IA se elige con AI_PROVIDER (google | anthropic); por defecto, el que tenga clave.
 */
export async function analyzeLabelCore(input: AnalyzeInput): Promise<AnalyzeResult> {
  const provider = activeProvider();
  if (!provider) {
    return { ok: false, status: 503, error: 'El análisis por IA no está configurado en el servidor.' };
  }
  if (!input || typeof input.base64 !== 'string' || !input.base64) {
    return { ok: false, status: 400, error: 'Falta la imagen.' };
  }
  if (!ALLOWED_TYPES.includes(input.mimeType as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, status: 415, error: 'Formato de imagen no soportado.' };
  }
  if (Math.floor((input.base64.length * 3) / 4) > MAX_BASE64_BYTES) {
    return { ok: false, status: 413, error: 'La imagen es demasiado grande.' };
  }

  return provider === 'google' ? analyzeWithGoogle(input) : analyzeWithAnthropic(input);
}
