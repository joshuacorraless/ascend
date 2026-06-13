/**
 * Validador AUTOCONTENIDO y SIN dependencias externas para la función serverless.
 * Se evita `zod` a propósito: inicializar un esquema zod en el arranque del
 * módulo provocaba que la función de Vercel se cayera (interop ESM). Aquí solo
 * se usa JavaScript plano, por lo que el módulo nunca falla al cargar.
 * Mantener la forma en sincronía con `src/lib/ai/labelSchema.ts` (frontend).
 */

export type ServingUnit = 'g' | 'ml' | 'unidad' | 'porcion';

export interface LabelAnalysis {
  productName: string | null;
  brand: string | null;
  servingSize: number | null;
  servingUnit: ServingUnit | null;
  servingsPerContainer: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  confidence: number;
  warnings: string[];
}

export interface AnalyzeInput {
  base64: string;
  mimeType: string;
  productName?: string;
}

export type AnalyzeResult =
  | { ok: true; analysis: LabelAnalysis }
  | { ok: false; status: number; error: string };

function nonNegNumOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
function unitOrNull(v: unknown): ServingUnit | null {
  return v === 'g' || v === 'ml' || v === 'unidad' || v === 'porcion' ? v : null;
}

/**
 * Normaliza la salida del modelo a `LabelAnalysis`. Es tolerante: rellena con
 * null lo que falte (el usuario revisa y corrige antes de guardar). Devuelve
 * null solo si la entrada no es un objeto.
 */
export function validateLabel(raw: unknown): LabelAnalysis | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const confidence =
    typeof o.confidence === 'number' && o.confidence >= 0 && o.confidence <= 1 ? o.confidence : 0.5;
  const warnings = Array.isArray(o.warnings)
    ? o.warnings.filter((w): w is string => typeof w === 'string')
    : [];
  return {
    productName: strOrNull(o.productName),
    brand: strOrNull(o.brand),
    servingSize: nonNegNumOrNull(o.servingSize),
    servingUnit: unitOrNull(o.servingUnit),
    servingsPerContainer: nonNegNumOrNull(o.servingsPerContainer),
    calories: nonNegNumOrNull(o.calories),
    protein: nonNegNumOrNull(o.protein),
    carbs: nonNegNumOrNull(o.carbs),
    fat: nonNegNumOrNull(o.fat),
    fiber: nonNegNumOrNull(o.fiber),
    sugar: nonNegNumOrNull(o.sugar),
    sodium: nonNegNumOrNull(o.sodium),
    confidence,
    warnings,
  };
}
