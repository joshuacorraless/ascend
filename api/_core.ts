import Anthropic from '@anthropic-ai/sdk';
import { labelAnalysisSchema } from '../src/lib/ai/labelSchema';
import type { AnalyzeInput, AnalyzeResult } from '../src/lib/ai/types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BASE64_BYTES = 6 * 1024 * 1024; // ~6 MB de imagen decodificada

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Esquema JSON (no Zod) que se entrega al modelo como herramienta forzada.
const TOOL_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    productName: { type: ['string', 'null'] },
    brand: { type: ['string', 'null'] },
    servingSize: { type: ['number', 'null'], description: 'Tamaño numérico de la porción' },
    servingUnit: { type: ['string', 'null'], enum: ['g', 'ml', 'unidad', 'porcion', null] },
    servingsPerContainer: { type: ['number', 'null'] },
    calories: { type: ['number', 'null'], description: 'kcal por porción' },
    protein: { type: ['number', 'null'], description: 'g por porción' },
    carbs: { type: ['number', 'null'], description: 'g por porción' },
    fat: { type: ['number', 'null'], description: 'g por porción' },
    fiber: { type: ['number', 'null'], description: 'g por porción' },
    sugar: { type: ['number', 'null'], description: 'g por porción' },
    sodium: { type: ['number', 'null'], description: 'mg por porción' },
    confidence: { type: 'number', description: 'Confianza global 0–1' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['confidence', 'warnings'],
} as const;

function buildPrompt(productName?: string): string {
  return [
    'Eres un asistente que extrae la información de una tabla nutricional a partir de una foto.',
    'Devuelve SIEMPRE los valores POR PORCIÓN (no por 100 g si la porción es distinta).',
    'Si un dato no es legible o no aparece, ponlo en null; NO inventes valores.',
    'El sodio va en miligramos. La confianza es un número entre 0 y 1.',
    'Añade advertencias en "warnings" si: la imagen está borrosa, no se ve la porción,',
    'hay varias columnas (por porción vs por 100 g), o la suma de macros parece inconsistente.',
    productName ? `El usuario indica que el producto es: "${productName}".` : '',
    'Usa la herramienta "registrar_etiqueta" para entregar los datos estructurados.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Lógica central del análisis de etiqueta (independiente del framework).
 * La usan tanto el endpoint de Vercel como el middleware de desarrollo.
 */
export async function analyzeLabelCore(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (!isAiConfigured()) {
    return { ok: false, status: 503, error: 'El análisis por IA no está configurado en el servidor.' };
  }
  if (!input || typeof input.base64 !== 'string' || !input.base64) {
    return { ok: false, status: 400, error: 'Falta la imagen.' };
  }
  if (!ALLOWED_TYPES.includes(input.mimeType as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, status: 415, error: 'Formato de imagen no soportado.' };
  }
  const approxBytes = Math.floor((input.base64.length * 3) / 4);
  if (approxBytes > MAX_BASE64_BYTES) {
    return { ok: false, status: 413, error: 'La imagen es demasiado grande.' };
  }

  const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: 'registrar_etiqueta',
          description: 'Registra los datos nutricionales extraídos de la etiqueta (por porción).',
          input_schema: TOOL_INPUT_SCHEMA as unknown as Anthropic.Tool.InputSchema,
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
      return { ok: false, status: 500, error: 'La clave de IA del servidor es inválida.' };
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
