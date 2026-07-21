import { z } from 'zod';

/**
 * Esquema de la extracción de una etiqueta nutricional. Compartido entre el
 * frontend y el endpoint serverless, por lo que solo depende de `zod`.
 * Los valores son por porción; lo que el modelo no pueda leer llega como `null`.
 */
const nullableNum = z.number().finite().nonnegative().nullable();

export const servingUnitSchema = z.enum(['g', 'ml', 'unidad', 'porcion']).nullable();

export const labelAnalysisSchema = z.object({
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  servingSize: nullableNum,
  servingUnit: servingUnitSchema,
  servingsPerContainer: nullableNum,
  calories: nullableNum,
  protein: nullableNum,
  carbs: nullableNum,
  fat: nullableNum,
  fiber: nullableNum,
  sugar: nullableNum,
  /** Sodio en miligramos. */
  sodium: nullableNum,
  /** Confianza global 0–1. */
  confidence: z.number().min(0).max(1).catch(0.5),
  /** Advertencias legibles (imagen borrosa, varias columnas, por 100 g, etc.). */
  warnings: z.array(z.string()).default([]),
});

export type LabelAnalysis = z.infer<typeof labelAnalysisSchema>;
