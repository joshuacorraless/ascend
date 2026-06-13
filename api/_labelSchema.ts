import { z } from 'zod';

/**
 * Copia AUTOCONTENIDA del esquema de extracción de etiquetas para la función
 * serverless. Vercel no incluye archivos fuera de `/api` en el bundle de la
 * función, por eso NO importamos desde `../src`. Mantener en sincronía con
 * `src/lib/ai/labelSchema.ts` (misma forma de datos).
 */
const nullableNum = z.number().finite().nonnegative().nullable();

export const labelAnalysisSchema = z.object({
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  servingSize: nullableNum,
  servingUnit: z.enum(['g', 'ml', 'unidad', 'porcion']).nullable(),
  servingsPerContainer: nullableNum,
  calories: nullableNum,
  protein: nullableNum,
  carbs: nullableNum,
  fat: nullableNum,
  fiber: nullableNum,
  sugar: nullableNum,
  sodium: nullableNum,
  confidence: z.number().min(0).max(1).catch(0.5),
  warnings: z.array(z.string()).default([]),
});

export type LabelAnalysis = z.infer<typeof labelAnalysisSchema>;

export interface AnalyzeInput {
  base64: string;
  mimeType: string;
  productName?: string;
}

export type AnalyzeResult =
  | { ok: true; analysis: LabelAnalysis }
  | { ok: false; status: number; error: string };
