import { z } from 'zod';

/**
 * Esquema ESTRICTO de la extracción de una etiqueta nutricional por IA.
 * Compartido entre el frontend (validación de la respuesta) y el endpoint
 * serverless. Solo depende de `zod` para poder importarse desde `api/`.
 *
 * Todos los valores nutricionales son POR PORCIÓN. Lo que el modelo no pueda
 * leer con seguridad debe venir como `null` (no inventado).
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
